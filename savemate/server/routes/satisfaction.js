// server/routes/satisfaction.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');

/**
 * POST /api/satisfaction
 * Body: { uid, transactionId, emotion, reason, memo }
 */
router.post('/', async (req, res) => {
  try {
    const { uid, transactionId, emotion, reason, memo } = req.body;

    if (!uid || !transactionId || !emotion || !reason) {
      return res.status(400).json({ ok: false, error: 'missing fields' });
    }

    const doc = {
      userId: uid,
      transactionId,
      emotion,             // 'dissatisfied' | 'neutral' | 'satisfied'
      reason,
      memo: memo ?? '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection('satisfactionRatings').add(doc);
    res.status(201).json({ ok: true, id: ref.id });
  } catch (e) {
    console.error('[POST /api/satisfaction Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// server/routes/satisfaction.js (추가)
router.get('/', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid is required' });
    }

    const snap = await db.collection('satisfactionRatings')
                         .where('userId', '==', uid)
                         .orderBy('createdAt', 'desc')
                         .get();

    const items = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()?.toISOString() ?? null,
    }));

    // transactionId만 포함하는 간소화된 목록 반환 (클라이언트에서 Set 생성 목적)
    const simpleItems = items.map(item => ({ transactionId: item.transactionId }));

    res.json({ ok: true, items: simpleItems });
  } catch (e) {
    console.error('[GET /api/satisfaction Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
