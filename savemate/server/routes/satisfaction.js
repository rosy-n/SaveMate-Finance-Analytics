// server/routes/satisfaction.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');

const now = admin.firestore.FieldValue.serverTimestamp();

/**
 * POST /api/satisfaction
 * Body:
 * {
 *   uid: string,
 *   transactionId: string,
 *   emotion: 'dissatisfied' | 'neutral' | 'satisfied',
 *   reasons: string[],   <-- 배열
 *   memo?: string
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { uid, transactionId, emotion, reasons, memo } = req.body;

    // 필수값 체크
    if (!uid || !transactionId || !emotion || !Array.isArray(reasons)) {
      return res.status(400).json({
        ok: false,
        error: 'missing fields or reasons must be an array',
      });
    }

    // 저장할 문서
    const doc = {
      transactionId,
      emotion,
      reasons,            // 배열로 저장
      memo: memo ?? '',
      createdAt: now,
    };

    // 사용자 기반 경로에 저장
    const satRef = await db
      .collection('users')
      .doc(uid)
      .collection('satisfactionRatings')
      .add(doc);

    // 해당 거래의 isRated = true 업데이트
    await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .doc(transactionId)
      .update({ isRated: true, updatedAt: now });

    // --- LLM 리포트 캐시 삭제 시작 ---
    try {
      // 1) 해당 거래 날짜 가져오기
      const txSnap = await db
        .collection('users')
        .doc(uid)
        .collection('transactions')
        .doc(transactionId)
        .get();

      if (txSnap.exists) {
        const t = txSnap.data() || {};
        const baseDate = t.date?.toDate
          ? t.date.toDate()
          : t.occurredAt?.toDate
          ? t.occurredAt.toDate()
          : t.date
          ? new Date(t.date)
          : null;

        if (baseDate) {
          const year = baseDate.getFullYear();
          const month = String(baseDate.getMonth() + 1).padStart(2, '0');

          // 2) 캐시 삭제
          await db
            .collection('users')
            .doc(uid)
            .collection('cachedReports')
            .doc(`${year}-${month}`)
            .delete();

          console.log(`[satisfaction] 캐시 삭제됨: ${year}-${month}`);
        }
      }
    } catch (err) {
      console.error('[satisfaction] 캐시 삭제 오류', err);
    }

    return res.status(201).json({ ok: true, id: satRef.id });

  } catch (e) {
    console.error('[POST /api/satisfaction Error]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


/**
 * GET /api/satisfaction/:uid
 * 해당 사용자의 모든 만족도 평가 조회
 */
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('satisfactionRatings')
      .orderBy('createdAt', 'desc')
      .get();

    const items = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ ok: true, items });

  } catch (e) {
    console.error('[GET /api/satisfaction/:uid Error]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
