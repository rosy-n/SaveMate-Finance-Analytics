// server/routes/satisfaction.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');

const now = admin.firestore.FieldValue.serverTimestamp();

// 🔹 만족도 평가 생성
router.post('/', async (req, res) => {
  try {
    const { uid, transactionId, emotion, reason, memo } = req.body;

    if (!uid || !transactionId || !emotion || !reason) {
      return res.status(400).json({ ok: false, error: 'missing fields' });
    }

    const doc = {
      transactionId,
      emotion,           // 'dissatisfied' | 'neutral' | 'satisfied'
      reason,
      memo: memo ?? '',
      createdAt: now,
    };

    // ⭐ user 기반 경로로 저장
    const ref = await db
      .collection('users')
      .doc(uid)
      .collection('satisfactionRatings')
      .add(doc);

    // 🔹 해당 트랜잭션의 isRated = true 업데이트
    await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .doc(transactionId)
      .update({ isRated: true, updatedAt: now });

    res.status(201).json({ ok: true, id: ref.id });
  } catch (e) {
    console.error('[POST /api/satisfaction Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 🔹 특정 사용자의 만족도 평가 조회
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('satisfactionRatings')
      .orderBy('createdAt', 'desc')
      .get();

    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ ok: true, items });
  } catch (e) {
    console.error('[GET /api/satisfaction/:uid Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
