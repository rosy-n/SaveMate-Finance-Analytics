// server/routes/reports.js
const express = require('express');
const router = express.Router();
const { resolveUserId } = require('../db/users');
const txRepo = require('../db/transactions');
const ratingRepo = require('../db/satisfaction');
const reportCache = require('../db/cache');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { analyzeFinances, REPORT_VERSION } = require('../analytics/financeAnalytics');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const model = genAI.getGenerativeModel({ model: MODEL_ID });

// 이보다 평가가 적으면 패턴을 찾기 어려워 숨은 소비 패턴을 만들지 않는다.
const MIN_RATINGS_FOR_PATTERNS = 5;
const NO_EXPENSE_NOTICE = '이번 달 지출 내역이 없어요. 지출을 기록하면 AI 인사이트를 볼 수 있어요.';
const AI_ERROR_NOTICE = 'AI 인사이트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';

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
    if (
      cached &&
      cached.persona &&
      cached.analytics?.version === REPORT_VERSION
    ) {
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

    // 수치는 서버 코드가 계산하고 Gemini는 결과를 설명만 한다.
    const analytics = analyzeFinances(monthTx, normSats);


    // 3) 통계 계산
    const expense = monthTx.filter(
      (t) => String(t.type).toLowerCase() === 'expense'
    );

    // 지출이 없으면 해석할 내용이 없으므로 LLM을 호출하지 않는다.
    if (expense.length === 0) {
      return res.json({
        ok: true,
        report: { notice: NO_EXPENSE_NOTICE, analytics },
        meta: { counts: { tx: monthTx.length, sats: normSats.length }, cached: false, llmSkipped: true },
      });
    }

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
      codeCalculatedAnalytics: analytics,
    };

    // LLM 출력 스키마
    const schema = {
      persona: "",
      patterns: [{ pattern: "", evidence: "" }],
      next_actions: { action: "", challenge: "" },
    };

    const canFindPatterns = normSats.length >= MIN_RATINGS_FOR_PATTERNS;

    const prompt = `
    당신은 개인 소비 심리 코치입니다.
    아래 [데이터]만 근거로 한국어 존댓말로 작성하세요.
    반드시 JSON만 출력하고, 코드블록/설명 문장은 절대 포함하지 마세요.

    [역할]
    앱 화면이 금액, 카테고리 비중, 월별 추이, 만족 효율 점수, 평소보다 큰 지출, 불만족 지출 순위를 이미 보여줍니다.
    당신은 숫자를 설명하지 않고, 화면에 없는 해석과 다음 행동만 제공합니다.

    [규칙]
    - 화면에 이미 표시되는 금액, 비중, 순위, 만족 효율 점수, 상관계수를 다시 나열하지 마세요.
    - 메모, 불만족 이유, 지출 배경, 날짜를 엮어 화면에 없는 해석만 쓰세요.
    - 근거 기록이 부족한 내용은 쓰지 말고, 지어내지 마세요.
    - codeCalculatedAnalytics는 서버 코드가 계산한 확정 결과이므로 값을 바꾸지 마세요.
    - 상관관계를 인과관계로 단정하지 말고 "~로 보여요"처럼 표현하세요.

    [작성 항목]
    - persona: 이번 달 소비 성향을 한 문장으로 정의
    - patterns: ${canFindPatterns
      ? '숨은 소비 패턴 최대 2개. pattern은 해석 1문장, evidence는 판단 근거가 된 기록 1문장. 뚜렷한 패턴이 없으면 빈 배열'
      : '평가 기록이 부족하므로 반드시 빈 배열'}
    - next_actions.action: 다음 달에 바로 해볼 구체적인 행동 1개
    - next_actions.challenge: 실천할 수 있는 챌린지 1개

    [강조 표기]
    - 핵심 단어/구절은 문자열 안에서 <hl>...</hl> 로 감싸세요. 문장당 최대 1개만 사용하세요.
    - 강조는 <hl>...</hl> 태그만 사용하고 Markdown 문법(**, *, __, ~~ 등)은 절대 쓰지 마세요.
    - 태그는 문자열 값 안에만 넣고, JSON 구조(키 이름 등)는 바꾸지 마세요.

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
          if (typeof p?.persona !== 'string' || !p.persona.trim())
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

    // 7) 실패 → 안내만 반환. 캐시하면 복구 후에도 실패 문구가 남으므로 저장하지 않는다.
    if (!parsed) {
      return res.json({
        ok: true,
        report: { notice: AI_ERROR_NOTICE, analytics },
        meta: { counts: { tx: monthTx.length, sats: normSats.length }, cached: false, degraded: true },
      });
    }

    parsed = {
      persona: parsed.persona.trim(),
      patterns: canFindPatterns && Array.isArray(parsed.patterns)
        ? parsed.patterns
          .map((p) => ({
            pattern: String(p?.pattern || '').trim(),
            evidence: String(p?.evidence || '').trim(),
          }))
          .filter((p) => p.pattern)
          .slice(0, 2)
        : [],
      next_actions: {
        action: String(parsed.next_actions?.action || '').trim(),
        challenge: String(parsed.next_actions?.challenge || '').trim(),
      },
    };



    // 8) 정상 생성 → 캐시 저장
    parsed.analytics = analytics;
    await reportCache.setReport(
      userId,
      y,
      m,
      {
        ...parsed,
        version: REPORT_VERSION,
        period: `${year}-${String(month).padStart(2, '0')}`,
        generatedAt: new Date().toISOString(),
      },
      usedModel || MODEL_ID
    );

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
      report: { notice: AI_ERROR_NOTICE },
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
