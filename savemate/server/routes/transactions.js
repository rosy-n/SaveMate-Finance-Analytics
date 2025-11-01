// server/routes/transactions.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');

/**
 * POST /api/transactions
 * Body: { uid, amount, type, category?, memo?, date }  // date: "YYYY-MM-DD"
 * 저장 위치: users/{uid}/transactions/{tid}
 */
router.post('/', async (req, res) => {
  try {
    const { uid, amount, type, category, memo, date } = req.body;

    // 필수값 검증
    if (!uid || amount == null || !type || !date) {
      return res.status(400).json({
        ok: false,
        error: 'missing fields (uid, amount, type, date)',
      });
    }

    // 간단 유효성
    const _amount = Number(amount);
    if (!Number.isFinite(_amount)) {
      return res.status(400).json({ ok: false, error: 'amount must be a number' });
    }

    // 날짜를 Timestamp로 저장(정렬 안정화)
    const ts = admin.firestore.Timestamp.fromDate(new Date(date));

    const doc = {
      amount: _amount,
      type,                                   // 'expense' | 'income'
      category: category ?? null,
      memo: memo ?? null,
      date: ts,                               // Firestore Timestamp
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .add(doc);

    return res.status(201).json({ ok: true, id: ref.id });
  } catch (e) {
    console.error('[Firestore POST Error]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/transactions?uid=...&limit=20
 * 읽기 위치: users/{uid}/transactions
 */
router.get('/', async (req, res) => {
  try {
    const { uid, limit = 20 } = req.query;
    if (!uid) return res.status(400).json({ ok: false, error: 'uid is required' });

    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .orderBy('date', 'desc')
      .limit(Number(limit))
      .get();

    const items = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        // Timestamp → ISO 문자열로 변환해서 전달
        date: data.date && data.date.toDate ? data.date.toDate().toISOString().slice(0, 10) : data.date,
        createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : null,
      };
    });

    res.json({ ok: true, count: items.length, items });
  } catch (e) {
    console.error('[Firestore GET Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
