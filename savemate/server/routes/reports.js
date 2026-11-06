// server/routes/reports.js
const express = require('express');
const router = express.Router();
const { resolveUserId } = require('../db/users');
const txRepo = require('../db/transactions');
const ratingRepo = require('../db/satisfaction');
const reportCache = require('../db/cache');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const model = genAI.getGenerativeModel({ model: MODEL_ID });

function redact(text = '') {
  return String(text)
    .replace(/\b\d{3}-\d{4}-\d{4}\b/g, '***-****-****')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '***@***')
    .slice(0, 160);
}

function safeParseJSON(s) {
  try {
    const m =
      s.match(/\{[\s\S]*\}$/m) ||
      s.match(/```json([\s\S]*?)```/m) ||
      s.match(/```([\s\S]*?)```/m);
    const raw = m ? (m[1] ? m[1] : m[0]) : s;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetries(fn, { tries = 3, base = 500 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const code = e?.status || e?.code;
      const retryable =
        code === 503 ||
        code === 429 ||
        /overloaded|quota|exhausted/i.test(String(e));

      if (!retryable || i === tries - 1) break;

      const delay = Math.floor(
        base * Math.pow(2, i) * (0.7 + Math.random() * 0.6)
      );
      await sleep(delay);
    }
  }
  throw last;
}

router.get('/consumption', async (req, res) => {
  try {
    const { uid, year, month } = req.query;
    if (!uid || !year || !month) {
      return res
        .status(400)
        .json({ ok: false, error: 'uid/year/month required' });
    }

    const y = Number(year), m = Number(month);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({ ok: false, error: 'invalid year/month' });
    }

    const userId = await resolveUserId(uid);
    if (!userId) {
      return res.status(404).json({ ok: false, error: 'user not found' });
    }

    // 0) 캐시 체크
    const cached = await reportCache.getReport(userId, y, m);
    if (cached && (cached.summary || cached.persona || cached.insights)) {
      return res.json({
        ok: true,
        report: cached,
        meta: { cached: true, model: MODEL_ID },
      });
    }

    // 1) 월별 거래 읽기
    const monthTx = (await txRepo.listByMonth(userId, y, m)).map((t) => ({
      ...t,
      date: new Date(t.date),
    }));

    // 2) 만족도 평가 읽기 (이번 달 거래에 대한 것만)
    const sats = await ratingRepo.listForTransactions(
      userId,
      monthTx.map((t) => t.id)
    );

    const normSats = sats.map((s) => ({
      transactionId: String(s.transactionId),
      emotion: (s.emotion || "").toLowerCase(),
      reasons: Array.isArray(s.reasons) ? s.reasons : [],
      memo: s.memo || "",
      createdAt: s.createdAt || null,
    }));


    // 3) 통계 계산
    const expense = monthTx.filter(
      (t) => String(t.type).toLowerCase() === 'expense'
    );

    const sumBy = (arr, key) =>
      arr.reduce((m, t) => {
        const k =
          typeof key === 'function' ? key(t) : t[key] || '기타';
        m[k] = (m[k] || 0) + Number(t.amount || 0);
        return m;
      }, {});

    const cntBy = (arr, key) =>
      arr.reduce((m, t) => {
        const k =
          typeof key === 'function' ? key(t) : t[key] || '기타';
        m[k] = (m[k] || 0) + 1;
        return m;
      }, {});

    const byCategory = sumBy(expense, 'category');
    const byPayment = cntBy(
      expense,
      (t) => t.paymentMethod || t.expenseDetail?.paymentMethod || '기타'
    );
    const emotions = cntBy(sats, 'emotion');
    const reasons = cntBy(sats, 'reason');

    const dissatisfiedSamples = sats
      .filter((s) => s.emotion === 'dissatisfied')
      .slice(0, 3)
      .map((s) => {
        const t = monthTx.find((x) => x.id === s.transactionId) || {};
        return {
          amount: t.amount,
          category: t.category || '기타',
          memo: redact(t.memo || ''),
          background:
            t.spendingBackground ||
            t.expenseDetail?.spendingBackground ||
            null,
          date: t.date ? t.date.toISOString() : null,
          reason: s.reason || null,
        };
      });

    // 4) LLM 입력 데이터 (satisfactionRecords 포함)
    const llmInput = {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totals: {
        expenseSum: expense.reduce(
          (a, b) => a + Number(b.amount || 0),
          0
        ),
        expenseCount: expense.length,
      },
      byCategory,
      byPayment,
      emotions,
      reasons,
      dissatisfiedSamples,
      satisfactionRecords: sats,
    };

    // LLM 출력 스키마
    const schema = {
      persona: "",
      summary: "",
      insights: {
        key_insights: [],
        cost_efficiency: [],
        emotion_patterns: {
          dissatisfied: [],
          neutral: [],
          satisfied: []
        }
      },
      actions: {
        improvements: [],
        saving_opportunities: [],
        challenge_suggestions: []
      }
    };

    const prompt = `
    당신은 개인 재무/소비 심리 코치입니다.
    아래 [데이터]만 근거로 한국어 존댓말로 분석하세요.
    반드시 JSON만 출력하고, 코드블록/설명 문장은 절대 포함하지 마세요.

    // 중요 구절 태그 규칙 추가
    - 사용자가 꼭 봐야 할 핵심 단어/구절(큰 변화, 원인, 위험, 행동 키워드)은 문자열 안에서 <hl>...</hl> 로 감싸서 표시하세요.
    - 각 문장당 <hl> 태그는 최대 1~2개만 사용하세요. 남발 금지.

    - 강조는 오직 <hl>...</hl> 태그만 사용하세요.
    - Markdown 문법(**, *, __, ~~ 등)은 절대 사용하지 마세요.
    - 특히 **텍스트** 처럼 별표(**)로 감싸는 굵게 표기 방식은 사용하면 안 됩니다.
    - 만약 스스로 만든 응답 안에 **, *, __, ~~ 가 들어가 있다고 인식되면,
      그 응답은 잘못된 것이므로 해당 기호를 모두 제거한 버전으로 다시 생성하세요.

    - 태그는 반드시 text 내부에만 넣고, JSON 구조(키 이름 등)는 절대 바꾸지 마세요.



    [목표]
    - 사용자 소비 페르소나를 1~2문장으로 정의 (persona)
    - 월 전체 요약 2~3문장 (summary)
    - 핵심 인사이트 3개 내외 (insights.key_insights)
    - 카테고리별 비용-만족 효율 분석 4개 내외 (insights.cost_efficiency)
    - 감정패턴은 불만족/보통/만족 각각 2~3개 내외 (insights.emotion_patterns)
    - 개선 행동 2~3개 (actions.improvements)
    - 절약 기회 1~2개 (actions.saving_opportunities)
    - 실천 가능한 챌린지 2~3개 (actions.challenge_suggestions)

    [데이터]
    ${JSON.stringify(llmInput, null, 2)}

    [출력 스키마]
    ${JSON.stringify(schema, null, 2)}
    `.trim();

    // 5) 모델 페일오버 목록
    const modelIds = [
      MODEL_ID,
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
    ];

    let parsed = null;
    let usedModel = null;

    // 6) 재시도 + 페일오버
    for (const mid of modelIds) {
      try {
        usedModel = mid;

        const runOnce = async () => {
          const controller = new AbortController();
          const timer = setTimeout(
            () => controller.abort(),
            7000
          );

          const m = genAI.getGenerativeModel({ model: mid });
          const result = await m.generateContent({
            contents: [
              { role: 'user', parts: [{ text: prompt }] },
            ],
          });

          clearTimeout(timer);
          const text = result.response.text();
          const p = safeParseJSON(text);
          if (!p)
            throw Object.assign(
              new Error('JSON parse failed'),
              { status: 500 }
            );
          return p;
        };

        parsed = await withRetries(runOnce, {
          tries: 3,
          base: 600,
        });
        break;
      } catch (e) {
        const retryable =
          e?.status === 503 ||
          e?.status === 429 ||
          /overloaded|quota/i.test(String(e));
        if (!retryable) break;
      }
    }

    // 7) 실패 → 폴백
    if (!parsed) {
      parsed = {
        persona: "소비 페르소나를 생성하지 못했습니다.",
        summary: `${year}년 ${month}월 AI 요약 생성이 지연되어 간단 요약만 제공합니다.`,
        insights: {
          key_insights: [],
          cost_efficiency: [],
          emotion_patterns: { dissatisfied: [], neutral: [], satisfied: [] }
        },
        actions: {
          improvements: [],
          saving_opportunities: [],
          challenge_suggestions: []
        }
      };

      // 8) 정상 생성 → 캐시 저장 (✅ 항상 저장 + 메타 포함)
        await reportCache.setReport(
          userId,
          y,
          m,
          {
            ...parsed,
            generatedAt: new Date().toISOString(),
            period: `${year}-${String(month).padStart(2, '0')}`,
            version: 'v2-persona-insights-actions', // 스키마 버전 태그(선택)
          },
          usedModel || MODEL_ID
        );

        return res.json({
          ok: true,
          report: parsed,
          meta: {
            counts: { tx: monthTx.length, sats: normSats.length },
            model: usedModel || MODEL_ID,
            cached: false,
          },
        });

    }


    // 8) 정상 생성 → 캐시 저장
    await reportCache.setReport(userId, y, m, parsed, usedModel || MODEL_ID);

    return res.json({
      ok: true,
      report: parsed,
      meta: {
        counts: { tx: monthTx.length, sats: sats.length },
        model: usedModel || MODEL_ID,
      },
    });
  } catch (e) {
    console.error('[GET /api/reports/consumption Error]', e);

    return res.json({
      ok: true,
      report: {
        persona: "AI 리포트를 불러오지 못했습니다.",
        summary: "AI 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        insights: {
          key_insights: [],
          cost_efficiency: [],
          emotion_patterns: { dissatisfied: [], neutral: [], satisfied: [] }
        },
        actions: {
          improvements: [],
          saving_opportunities: [],
          challenge_suggestions: []
        }
      },
      meta: {
        cached: false,
        model: MODEL_ID,
        degraded: true,
        error: String(e?.message || e),
      },
    });
  }
});

module.exports = router;
