// // server/routes/reports.js
// const express = require('express');
// const router = express.Router();
// const { db, admin } = require('../firebaseAdmin');
// const { GoogleGenerativeAI } = require('@google/generative-ai');

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash';


// const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

// const getMonthRange = (year, month) => {
//   const y = Number(year), m = Number(month);
//   const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
//   const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
//   return {
//     start: admin.firestore.Timestamp.fromDate(startDate),
//     end: admin.firestore.Timestamp.fromDate(endDate),
//   };
// };

// function redact(text = '') {
//   return String(text)
//     .replace(/\b\d{3}-\d{4}-\d{4}\b/g, '***-****-****')
//     .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '***@***')
//     .slice(0, 160);
// }
// function safeParseJSON(s) {
//   try {
//     const m = s.match(/\{[\s\S]*\}$/m) || s.match(/```json([\s\S]*?)```/m) || s.match(/```([\s\S]*?)```/m);
//     const raw = m ? (m[1] ? m[1] : m[0]) : s;
//     return JSON.parse(raw);
//   } catch { return null; }
// }

// const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
// const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// async function withRetries(fn, { tries = 3, base = 500 } = {}) {
//   let last;
//   for (let i = 0; i < tries; i++) {
//     try { return await fn(); }
//     catch (e) {
//       last = e;
//       const code = e?.status || e?.code;
//       const retryable = code === 503 || code === 429 || /overloaded|quota|exhausted/i.test(String(e));
//       if (!retryable || i === tries - 1) break;
//       const delay = Math.floor(base * Math.pow(2, i) * (0.7 + Math.random() * 0.6)); // 지수백오프+지터
//       await sleep(delay);
//     }
//   }
//   throw last;
// }

// router.get('/consumption', async (req, res) => {
//   try {
//     const { uid, year, month } = req.query;
//     if (!uid || !year || !month) {
//       return res.status(400).json({ ok: false, error: 'uid/year/month required' });
//     }

//     const { start, end } = getMonthRange(year, month);

//     // 0) 캐시 먼저 확인
//     const cKey = monthKey(year, month);
//     const cacheRef = db.collection('users').doc(uid).collection('cachedReports').doc(cKey);
//     const cached = await cacheRef.get();
//     if (cached.exists && cached.data()?.summary) {
//       return res.json({ ok: true, report: cached.data(), meta: { cached: true, model: MODEL_ID } });
//     }

//     // 1) 해당 월 트랜잭션 / 만족도 읽기 
//     const txSnap = await db.collection('users').doc(uid).collection('transactions').get();
//     const monthTx = [];
//     for (const d of txSnap.docs) {
//       const v = d.data() || {};
//       const dt = v.date?.toDate ? v.date.toDate() : (v.date ? new Date(v.date) : null);
//       if (!dt) continue;
//       if (dt >= start.toDate() && dt < end.toDate()) monthTx.push({ id: d.id, ...v, date: dt });
//     }

//     const txIds = new Set(monthTx.map(t => t.id));
//     const satSnap = await db.collection('satisfactionRatings').where('userId', '==', uid).get();
//     const sats = satSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => txIds.has(s.transactionId));

//     const expense = monthTx.filter(t => String(t.type).toLowerCase() === 'expense');
//     const sumBy = (arr, key) => arr.reduce((m, t) => { const k = typeof key === 'function' ? key(t) : (t[key] || '기타'); m[k] = (m[k] || 0) + Number(t.amount || 0); return m; }, {});
//     const cntBy = (arr, key) => arr.reduce((m, t) => { const k = typeof key === 'function' ? key(t) : (t[key] || '기타'); m[k] = (m[k] || 0) + 1; return m; }, {});

//     const byCategory = sumBy(expense, 'category');
//     const byPayment = cntBy(
//       expense,
//       t => t.paymentMethod || t.expenseDetail?.paymentMethod || '기타'
//     );
//     const emotions = cntBy(sats, 'emotion');
//     const reasons = cntBy(sats, 'reason');

//     const dissatisfiedSamples = sats.filter(s => s.emotion === 'dissatisfied').slice(0, 3).map(s => {
//       const t = monthTx.find(x => x.id === s.transactionId) || {};
//       return {
//         amount: t.amount, category: t.category || '기타', memo: redact(t.memo || ''),
//         background: t.spendingBackground || t.expenseDetail?.spendingBackground || null,
//         date: t.date ? t.date.toISOString() : null, reason: s.reason || null
//       };
//     });

//     const llmInput = {
//       period: `${year}-${String(month).padStart(2, '0')}`,
//       totals: {
//         expenseSum: expense.reduce((a, b) => a + Number(b.amount || 0), 0),
//         expenseCount: expense.length
//       },
//       byCategory, byPayment, emotions, reasons, dissatisfiedSamples
//     };

//     const schema = {
//       summary: "",
//       habits: [],
//       emotion_patterns: {
//         dissatisfied_top_reasons: [],
//         neutral_insights: [],
//         satisfied_top_reasons: []
//       },
//       spending_risks: [{ trigger: "", why: "", suggestion: "" }],
//       actions_next_week: [],
//       challenge_suggestions: []
//     };

//     const prompt = `
// 당신은 개인 재무/행동경제학 코치입니다. 주어진 데이터만 근거로 한국어 존댓말로 작성하세요.
// 반드시 아래 JSON 스키마 형식 그대로만 출력하세요. 코드블록/여분 텍스트 금지.

// [데이터]
// ${JSON.stringify(llmInput)}

// [출력 스키마]
// ${JSON.stringify(schema)}
// `.trim();

//     // 2) 모델 페일오버 목록
//     const modelIds = [
//       MODEL_ID,
//       'gemini-1.5-flash',
//       'gemini-1.5-pro'
//     ];

//     // 3) 503/429 재시도 + 페일오버
//     let parsed = null;
//     let usedModel = null;

//     for (const mid of modelIds) {
//       try {
//         usedModel = mid;
//         const runOnce = async () => {
//           // (SDK에 signal 미지원일 수 있어 수동 타임아웃)
//           const controller = new AbortController();
//           const timer = setTimeout(() => controller.abort(), 7000);

//           const m = genAI.getGenerativeModel({ model: mid });
//           const result = await m.generateContent({
//             contents: [{ role: 'user', parts: [{ text: prompt }] }],
//             // signal: controller.signal, // 지원 시 사용
//           });

//           clearTimeout(timer);
//           const text = result.response.text();
//           const p = safeParseJSON(text);
//           if (!p) throw Object.assign(new Error('JSON parse failed'), { status: 500 });
//           return p;
//         };

//         parsed = await withRetries(runOnce, { tries: 3, base: 600 });
//         break; // 성공
//       } catch (e) {
//         const retryable = (e?.status === 503 || e?.status === 429 || /overloaded|quota/i.test(String(e)));
//         if (!retryable) break; // 비재시도 오류면 중단
//         // 다음 모델로 페일오버
//       }
//     }

//     // 4) 실패해도 200 + 폴백으로 응답 (프론트 UX 유지)
//     if (!parsed) {
//       parsed = {
//         summary: `${year}년 ${month}월 AI 요약 생성이 지연되어 간단 요약만 제공합니다.`,
//         habits: [],
//         emotion_patterns: { dissatisfied_top_reasons: [], neutral_insights: [], satisfied_top_reasons: [] },
//         spending_risks: [],
//         actions_next_week: [],
//         challenge_suggestions: []
//       };
//       // 폴백도 캐시해 두면 중복 호출 방지
//       await cacheRef.set(parsed, { merge: true });
//       return res.json({ ok: true, report: parsed, meta: { cached: false, model: usedModel || MODEL_ID, degraded: true } });
//     }

//     // 5) 정상 생성 시 캐시 저장 후 반환
//     await cacheRef.set(parsed, { merge: true });
//     return res.json({
//       ok: true,
//       report: parsed,
//       meta: { counts: { tx: monthTx.length, sats: sats.length }, model: usedModel || MODEL_ID }
//     });

//   } catch (e) {
//     console.error('[GET /api/reports/consumption Error]', e);
//     // 최종 예외도 200 + 폴백
//     return res.json({
//       ok: true,
//       report: {
//         summary: 'AI 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
//         habits: [],
//         emotion_patterns: { dissatisfied_top_reasons: [], neutral_insights: [], satisfied_top_reasons: [] },
//         spending_risks: [],
//         actions_next_week: [],
//         challenge_suggestions: []
//       },
//       meta: { cached: false, model: MODEL_ID, degraded: true, error: String(e?.message || e) }
//     });
//   }
// });

// module.exports = router;

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
    if (cached.exists && cached.data()?.summary) {
      return res.json({
        ok: true,
        report: cached.data(),
        meta: { cached: true, model: MODEL_ID },
      });
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

    // ⭐ 2) 만족도 평가 읽기 (users/{uid}/satisfactionRatings)
    const satSnap = await db
      .collection('users')
      .doc(uid)
      .collection('satisfactionRatings')
      .get();

    const sats = satSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((s) => txIds.has(s.transactionId));

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

    // ⭐ 4) LLM 입력 데이터 (satisfactionRecords 포함)
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
      satisfactionRecords: sats, // ⭐ 중요!
    };

    // ⭐ LLM 출력 스키마
    const schema = {
      summary: "",
      habits: [],
      emotion_patterns: {
        dissatisfied_top_reasons: [],
        neutral_insights: [],
        satisfied_top_reasons: []
      },
      spending_risks: [{ trigger: "", why: "", suggestion: "" }],
      actions_next_week: [],
      challenge_suggestions: []
    };

    // ⭐ 프롬프트 확장됨 (감정/만족도 포함)
    const prompt = `
당신은 개인 재무/소비 심리 코치입니다. 
주어진 데이터만 근거로 한국어 존댓말로 작성하세요.
반드시 JSON만 출력하고 코드블록은 금지합니다.

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
        summary: `${year}년 ${month}월 AI 요약 생성이 지연되어 간단 요약만 제공합니다.`,
        habits: [],
        emotion_patterns: {
          dissatisfied_top_reasons: [],
          neutral_insights: [],
          satisfied_top_reasons: [],
        },
        spending_risks: [],
        actions_next_week: [],
        challenge_suggestions: [],
      };

      await cacheRef.set(parsed, { merge: true });

      return res.json({
        ok: true,
        report: parsed,
        meta: {
          cached: false,
          model: usedModel || MODEL_ID,
          degraded: true,
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
        summary:
          'AI 리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
        habits: [],
        emotion_patterns: {
          dissatisfied_top_reasons: [],
          neutral_insights: [],
          satisfied_top_reasons: [],
        },
        spending_risks: [],
        actions_next_week: [],
        challenge_suggestions: [],
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
