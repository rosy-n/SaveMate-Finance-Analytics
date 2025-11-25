// server/routes/reports.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const model = genAI.getGenerativeModel({ model: MODEL_ID });

const getMonthRange = (year, month) => {
  const y = Number(year), m = Number(month);
  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  return {
    start: admin.firestore.Timestamp.fromDate(startDate),
    end: admin.firestore.Timestamp.fromDate(endDate),
  };
};

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

    const { start, end } = getMonthRange(year, month);

    // 0) 캐시 체크
    const cKey = monthKey(year, month);
    const cacheRef = db
      .collection('users')
      .doc(uid)
      .collection('cachedReports')
      .doc(cKey);

    const cached = await cacheRef.get();
      if (cached.exists) {
        const c = cached.data() || {};
        if (c.summary || c.persona || c.insights) {
          return res.json({
            ok: true,
            report: c,
            meta: { cached: true, model: MODEL_ID },
          });
        }
      }

    // 1) 월별 거래 읽기
    const txSnap = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .get();

    const monthTx = [];
    for (const d of txSnap.docs) {
      const v = d.data() || {};
      const dt = v.date?.toDate
        ? v.date.toDate()
        : v.date
        ? new Date(v.date)
        : null;
      if (!dt) continue;
      if (dt >= start.toDate() && dt < end.toDate())
        monthTx.push({ id: d.id, ...v, date: dt });
    }

    const txIds = new Set(monthTx.map((t) => t.id));

    // 2) 만족도 평가 읽기 (users/{uid}/satisfactionRatings)
    const satSnap = await db
      .collection('users')
      .doc(uid)
      .collection('satisfactionRatings')
      .get();

    const monthTxIds = new Set(
      monthTx.map(
        (tx) => String(tx.id || tx.tid || tx.transactionId || "")
      )
    );

    const allSats = satSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const sats = allSats.filter((s) => {
      const tid = String(
        s.transactionId || s.tid || s.txnId || ""
      ).trim();

      if (!tid) return false;
      return monthTxIds.has(tid);
    });

    const normSats = sats.map((s) => ({
      transactionId: String(s.transactionId || s.tid || s.txnId),
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
    - Markdown 문법(**, *, __, ~~ 등)을 절대 사용하지 마세요.
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
      'gemini-1.5-flash',
      'gemini-1.5-pro',
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
        await cacheRef.set(
          {
            ...parsed,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            period: `${year}-${String(month).padStart(2, '0')}`,
            version: 'v2-persona-insights-actions', // 스키마 버전 태그(선택)
          },
          { merge: true }
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
    await cacheRef.set(parsed, { merge: true });

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
