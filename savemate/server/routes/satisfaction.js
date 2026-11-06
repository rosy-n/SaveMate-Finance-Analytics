// server/routes/satisfaction.js
const express = require('express');
const router = express.Router();

const ratings = require('../db/satisfaction');
const cache = require('../db/cache');
const { userOr404, fail } = require('../lib/http');

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

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const saved = await ratings.upsert({ userId, transactionId, emotion, reasons, memo });
    if (!saved) {
      return res.status(404).json({ ok: false, error: 'transaction not found' });
    }

    // --- LLM 리포트 캐시 삭제: 해당 거래가 속한 달 ---
    await cache.deleteReportByDate(userId, saved.occurredOn);

    return res.status(201).json({ ok: true, id: saved.id });
  } catch (e) {
    return fail(res, '[POST /api/satisfaction Error]', e);
  }
});

/**
 * GET /api/satisfaction/:uid
 * 해당 사용자의 모든 만족도 평가 조회
 */
router.get('/:uid', async (req, res) => {
  try {
    const userId = await userOr404(res, req.params.uid);
    if (!userId) return;

    const items = await ratings.listByUser(userId);
    return res.json({ ok: true, items });
  } catch (e) {
    return fail(res, '[GET /api/satisfaction/:uid Error]', e);
  }
});

module.exports = router;
