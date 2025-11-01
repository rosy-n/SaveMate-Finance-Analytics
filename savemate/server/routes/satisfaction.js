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

module.exports = router;
