// server/routes/satisfaction.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');

/**
 * POST /api/satisfaction
 * Body: { uid, transactionId, emotion, reasons: string[], memo }
 */
router.post('/', async (req, res) => {
  // ❗ 트랜잭션이 아닌 batch()로 원자적 처리
  const batch = db.batch();

  try {
    const { uid, transactionId, emotion, reasons, memo } = req.body;

    // ⭐ 이유 → 반드시 배열이어야 함
    if (!uid || !transactionId || !emotion || !Array.isArray(reasons)) {
      return res.status(400).json({
        ok: false,
        error: 'missing fields or reasons must be an array',
      });
    }

    const nowServer = admin.firestore.FieldValue.serverTimestamp();

    // ⭐ 저장할 문서
    const doc = {
      userId: uid,
      transactionId,
      emotion,          // 'dissatisfied' | 'neutral' | 'satisfied'
      reasons,          // ⭐ 다중 선택 배열
      memo: memo ?? '',
      createdAt: nowServer,
    };

    // 1) 만족도 기록 저장
    const satRef = db.collection('satisfactionRatings').doc();
    batch.set(satRef, doc);

    // 2) 해당 거래 문서를 isRated = true로 변경
    const txnRef = db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .doc(transactionId);

    batch.set(
      txnRef,
      { isRated: true },
      { merge: true }
    );

    // 3) 커밋
    await batch.commit();

    res.status(201).json({ ok: true, id: satRef.id });
  } catch (e) {
    console.error('[POST /api/satisfaction Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/satisfaction
 * - txIds 존재 시 해당 트랜잭션들의 만족도 여부만 반환
 * - 없으면 최근 N개 반환
 */
router.get('/', async (req, res) => {
  try {
    const { uid, txIds } = req.query;
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid is required' });
    }

    // A) 특정 트랜잭션만 확인 모드
    if (txIds) {
      const ids = String(txIds)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (ids.length === 0) {
        return res.json({ ok: true, items: [] });
      }

      // Firestore: where("in") ≤ 10 제한 → 청크 나눔
      const CHUNK = 10;
      const chunks = [];
      for (let i = 0; i < ids.length; i += CHUNK) {
        chunks.push(ids.slice(i, i + CHUNK));
      }

      const items = [];
      for (const chunk of chunks) {
        const snap = await db
          .collection('satisfactionRatings')
          .where('userId', '==', uid)
          .where('transactionId', 'in', chunk)
          .get();

        snap.forEach(doc => {
          const d = doc.data();
          items.push({
            id: doc.id,
            transactionId: d.transactionId,
            createdAt: d.createdAt ?? null,
          });
        });
      }

      return res.json({ ok: true, items });
    }

    // B) 최근 만족도 N개 조회
    const limitN = Math.max(1, Math.min(Number(req.query.limit) || 500, 1000));

    const snap = await db
      .collection('satisfactionRatings')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limitN)
      .get();

    const items = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        transactionId: d.transactionId,
        createdAt: d.createdAt ?? null,
      };
    });

    return res.json({ ok: true, items });
  } catch (err) {
    console.error('[GET /api/satisfaction] error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
