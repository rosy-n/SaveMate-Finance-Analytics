// server/routes/tips.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/** YYYY-MM-DD */
const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** LLM이 JSON 앞뒤에 잡텍스트/코드블록을 붙여도 최대한 뽑아냄 */
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

/**
 * GET /api/tips/today?uid=...
 * return:
 * { ok: true, tip: { title, tips:[{content, reason}, ...] }, meta:{cached, model} }
 */
router.get('/today', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ ok: false, error: 'uid required' });

    const today = new Date();
    const tipKey = toYMD(today);

    // 0) 캐시: users/{uid}/cachedTips/{YYYY-MM-DD}
    const cacheRef = db.collection('users').doc(uid).collection('cachedTips').doc(tipKey);
    const cachedSnap = await cacheRef.get();

    if (cachedSnap.exists) {
      const c = cachedSnap.data() || {};

      if (Array.isArray(c.tips) && c.tips.length > 0) {
        return res.json({ ok: true, tip: c, meta: { cached: true, model: MODEL_ID } });
      }

      if (c.content) {
        const migrated = {
          title: c.title || "오늘의 절약팁",
          tips: [{ content: c.content, reason: c.reason || "" }],
        };
        await cacheRef.set(migrated, { merge: true });
        return res.json({ ok: true, tip: migrated, meta: { cached: true, model: MODEL_ID } });
      }
    }

    // 1) 최근 14일 지출 로드
    const since = new Date(today);
    since.setDate(since.getDate() - 14);
    const sinceTs = admin.firestore.Timestamp.fromDate(since);

    const snap = await db.collection('users').doc(uid).collection('transactions')
    .where('date', '>=', sinceTs)
    .orderBy('date', 'desc')
    .limit(300)
    .get();

    const expenses = snap.docs
    .map(d => {
        const v = d.data() || {};
        return {
        amount: Number(v.amount || 0),
        category: v.category || '기타',
        memo: v.memo || '',
        type: v.type,
        date: v.date?.toDate ? v.date.toDate().toISOString() : v.date
        };
    })
    .filter(x => x.type === 'expense');  // 로컬 필터링


    const byCategory = {};
    let total = 0;
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      total += e.amount;
    }

    const llmInput = {
      windowDays: 14,
      totalExpense: total,
      byCategory,
      recentSamples: expenses.slice(0, 10),
    };

    // 새 스키마: tips 배열
    const schema = {
      title: "오늘의 절약팁",
      tips: [
        { content: "", reason: "" }
      ]
    };

    const prompt = `
당신은 개인 소비 절약 코치입니다.
최근 소비 패턴 데이터만 근거로, 오늘 바로 실천 가능한 절약팁을 3~5개 한국어 존댓말로 주세요.
각 팁은 content 1~2문장(구체적인 행동)에 출력은 반드시 110자 이하로 제한하고, reason 1문장(왜 이 팁이 나왔는지)으로 작성하세요.
반드시 JSON만 출력하고 코드블록/여분 텍스트는 금지합니다.

[데이터]
${JSON.stringify(llmInput, null, 2)}

[출력 스키마]
${JSON.stringify(schema, null, 2)}
`.trim();

    const modelIds = [MODEL_ID, 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let parsed = null;
    let usedModel = null;

    for (const mid of modelIds) {
      try {
        usedModel = mid;

        parsed = await withRetries(async () => {
          const m = genAI.getGenerativeModel({ model: mid });
          const result = await m.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          });

          const text = result.response.text();
          const p = safeParseJSON(text);

          // tips 배열 검증
          if (!p?.tips || !Array.isArray(p.tips) || p.tips.length === 0) {
            throw Object.assign(new Error('JSON parse failed'), { status: 500 });
          }

          // tips 정리(빈 항목 제거)
          p.tips = p.tips
            .map(t => ({
              content: String(t?.content || '').trim(),
              reason: String(t?.reason || '').trim(),
            }))
            .filter(t => t.content.length > 0);

          if (p.tips.length === 0) {
            throw Object.assign(new Error('tips empty after sanitize'), { status: 500 });
          }

          p.title = p.title || "오늘의 절약팁";
          return p;
        }, { tries: 3, base: 600 });

        break;
      } catch (e) {
        const retryable =
          e?.status === 503 ||
          e?.status === 429 ||
          /overloaded|quota/i.test(String(e));

        if (!retryable) break;
      }
    }

    // 2) 폴백(LLM 실패 시)
    if (!parsed) {
      parsed = {
        title: "오늘의 절약팁",
        tips: [
          {
            content: "오늘은 카페/간식처럼 자주 나가는 소액 지출을 한 번만 줄여보세요. 하루 5천 원만 아껴도 한 달이면 꽤 커집니다.",
            reason: "최근 소액 지출이 반복될 가능성이 있어요."
          },
          {
            content: "배달 주문 전에 집에 있는 재료로 대체 가능한지 먼저 확인해보세요.",
            reason: "식비 지출을 가장 쉽게 줄일 수 있는 방법입니다."
          },
          {
            content: "구매 버튼을 누르기 전에 ‘내일도 필요할까?’를 10초만 생각해보세요.",
            reason: "충동구매를 줄이는 가장 간단한 루틴이에요."
          },
        ]
      };
    }

    // 3) 캐시 저장
    await cacheRef.set(parsed, { merge: true });

    return res.json({
      ok: true,
      tip: parsed,
      meta: { cached: false, model: usedModel || MODEL_ID }
    });

  } catch (e) {
    console.error('[GET /api/tips/today Error]', e);
    return res.json({
      ok: true,
      tip: {
        title: "오늘의 절약팁",
        tips: [
          {
            content: "절약팁을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
            reason: "서버 오류"
          }
        ]
      },
      meta: { degraded: true, error: String(e?.message || e) }
    });
  }
});

module.exports = router;
