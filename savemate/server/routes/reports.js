// server/routes/reports.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash';


const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

const getMonthRange = (year, month) => {
  const y = Number(year), m = Number(month);
  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endDate   = new Date(Date.UTC(y, m,     1, 0, 0, 0, 0));
  return {
    start: admin.firestore.Timestamp.fromDate(startDate),
    end:   admin.firestore.Timestamp.fromDate(endDate),
  };
};

function redact(text='') {
  return String(text)
    .replace(/\b\d{3}-\d{4}-\d{4}\b/g, '***-****-****')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '***@***')
    .slice(0,160);
}
function safeParseJSON(s) {
  try {
    const m = s.match(/\{[\s\S]*\}$/m) || s.match(/```json([\s\S]*?)```/m) || s.match(/```([\s\S]*?)```/m);
    const raw = m ? (m[1] ? m[1] : m[0]) : s;
    return JSON.parse(raw);
  } catch { return null; }
}

router.get('/consumption', async (req, res) => {
  try {
    const { uid, year, month } = req.query;
    if (!uid || !year || !month) return res.status(400).json({ ok:false, error:'uid/year/month required' });

    const { start, end } = getMonthRange(year, month);

    // 1) 해당 월 트랜잭션
    const txSnap = await db.collection('users').doc(uid).collection('transactions').get();
    const monthTx = [];
    for (const d of txSnap.docs) {
      const v = d.data() || {};
      const dt = v.date?.toDate ? v.date.toDate() : (v.date ? new Date(v.date) : null);
      if (!dt) continue;
      if (dt >= start.toDate() && dt < end.toDate()) monthTx.push({ id: d.id, ...v, date: dt });
    }

    // 2) 만족도 (같은 uid, 이번 달 트랜잭션에 매핑)
    const txIds = new Set(monthTx.map(t => t.id));
    const satSnap = await db.collection('satisfactionRatings').where('userId','==', uid).get();
    const sats = satSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => txIds.has(s.transactionId));

    // 3) 집계(간단)
    const expense = monthTx.filter(t => String(t.type).toLowerCase() === 'expense');
    const sumBy = (arr, key) => arr.reduce((m,t)=>{ const k = typeof key==='function'? key(t) : (t[key]||'기타'); m[k]=(m[k]||0)+Number(t.amount||0); return m; },{});
    const cntBy = (arr, key) => arr.reduce((m,t)=>{ const k = typeof key==='function'? key(t) : (t[key]||'기타'); m[k]=(m[k]||0)+1; return m; },{});

    const byCategory = sumBy(expense, 'category');
    const byPayment  = cntBy(expense, t => t.expenseDetail?.paymentMethod || '기타');
    const emotions   = cntBy(sats, 'emotion');
    const reasons    = cntBy(sats, 'reason');

    const dissatisfiedSamples = sats.filter(s=>s.emotion==='dissatisfied').slice(0,3).map(s=>{
      const t = monthTx.find(x=>x.id===s.transactionId) || {};
      return {
        amount: t.amount, category: t.category || '기타', memo: redact(t.memo || ''),
        background: t.expenseDetail?.spendingBackground || null,
        date: t.date ? t.date.toISOString() : null, reason: s.reason || null
      };
    });

    const llmInput = {
      period: `${year}-${String(month).padStart(2,'0')}`,
      totals: {
        expenseSum: expense.reduce((a,b)=>a + Number(b.amount||0), 0),
        expenseCount: expense.length
      },
      byCategory, byPayment, emotions, reasons, dissatisfiedSamples
    };

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

    const prompt = `
당신은 개인 재무/행동경제학 코치입니다. 주어진 데이터만 근거로 한국어 존댓말로 작성하세요.
반드시 아래 JSON 스키마 형식 그대로만 출력하세요. 코드블록/여분 텍스트 금지.

[데이터]
${JSON.stringify(llmInput)}

[출력 스키마]
${JSON.stringify(schema)}
`.trim();

    // LLM 프롬프트 전송
    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = result.response.text();

    const parsed = safeParseJSON(text) || {
      summary: "이번 달 데이터로 간단 요약만 제공합니다. 세부 인사이트 생성을 다시 시도해 주세요.",
      habits: [], emotion_patterns: { dissatisfied_top_reasons: [], neutral_insights: [], satisfied_top_reasons: [] },
      spending_risks: [], actions_next_week: [], challenge_suggestions: []
    };

    return res.json({ ok:true, report: parsed, meta: { counts: { tx: monthTx.length, sats: sats.length }, model: MODEL_ID } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error: e.message });
  }
});

module.exports = router;
