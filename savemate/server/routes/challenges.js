// server/routes/challenges.js
const express = require('express');
const router = express.Router();

const challenges = require('../db/challenges');
const { toKstDateString } = require('../lib/dates');
const { userOr404, fail, badRequest } = require('../lib/http');

const MAX_TARGET_AMOUNT = 2147483647; // challenges.target_amount(integer) 최대값
const isChallengeId = (v) => /^\d{1,18}$/.test(String(v));

/**
 * 기준 날짜 'YYYY-MM-DD'. 앱이 보낸 값이 있으면 그 값을 쓴다.
 * (EXPO_PUBLIC_FAKE_TODAY 로 앱의 날짜를 고정했을 때도 거래 날짜와 어긋나지 않도록)
 */
function resolveToday(value) {
  if (value == null || value === '') return toKstDateString(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw badRequest('invalid today');
  return String(value);
}

/**
 * GET /api/challenges/categories
 * 챌린지로 선택할 수 있는 지출 카테고리 목록
 */
router.get('/categories', async (req, res) => {
  try {
    return res.json({ ok: true, categories: await challenges.listCategories() });
  } catch (e) {
    return fail(res, '[GET /api/challenges/categories Error]', e);
  }
});

/**
 * GET /api/challenges/recommendation?uid=&today=
 * 지난달 지출 기준 추천 챌린지. 추천할 항목이 없으면 recommendation: null
 */
router.get('/recommendation', async (req, res) => {
  try {
    const today = resolveToday(req.query.today);
    const userId = await userOr404(res, req.query.uid);
    if (!userId) return;

    return res.json({ ok: true, recommendation: await challenges.recommend(userId, today) });
  } catch (e) {
    return fail(res, '[GET /api/challenges/recommendation Error]', e);
  }
});

/**
 * GET /api/challenges?uid=&today=
 * 기간이 끝나지 않았고 포기하지 않은 챌린지 목록
 */
router.get('/', async (req, res) => {
  try {
    const today = resolveToday(req.query.today);
    const userId = await userOr404(res, req.query.uid);
    if (!userId) return;

    return res.json({ ok: true, challenges: await challenges.listCurrent(userId, today) });
  } catch (e) {
    return fail(res, '[GET /api/challenges Error]', e);
  }
});

/**
 * GET /api/challenges/history?uid=&today=
 * 기간이 끝났거나 포기한 챌린지 목록
 */
router.get('/history', async (req, res) => {
  try {
    const today = resolveToday(req.query.today);
    const userId = await userOr404(res, req.query.uid);
    if (!userId) return;

    return res.json({ ok: true, challenges: await challenges.listPast(userId, today) });
  } catch (e) {
    return fail(res, '[GET /api/challenges/history Error]', e);
  }
});

/**
 * POST /api/challenges
 * Body: { uid, category, targetAmount, today? }
 * 기간은 오늘부터 그달 말일까지. 같은 카테고리에 끝나지 않은 챌린지가 있으면 409.
 */
router.post('/', async (req, res) => {
  try {
    const { uid, category, targetAmount } = req.body;
    if (!uid || !category) {
      return res.status(400).json({ ok: false, error: 'missing fields (uid, category)' });
    }
    if (!Number.isInteger(targetAmount) || targetAmount <= 0 || targetAmount > MAX_TARGET_AMOUNT) {
      return res.status(400).json({ ok: false, error: 'targetAmount must be a positive integer' });
    }
    const today = resolveToday(req.body.today);

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const id = await challenges.create({ userId, category, targetAmount, today });
    if (!id) {
      return res.status(409).json({ ok: false, error: 'challenge already exists for this category' });
    }
    return res.status(201).json({ ok: true, id });
  } catch (e) {
    return fail(res, '[POST /api/challenges Error]', e);
  }
});

/**
 * GET /api/challenges/:id?uid=&today=
 * 챌린지 상세와 기간 내 지출 내역
 */
router.get('/:id', async (req, res) => {
  try {
    const today = resolveToday(req.query.today);
    const userId = await userOr404(res, req.query.uid);
    if (!userId) return;

    const found = isChallengeId(req.params.id)
      ? await challenges.getWithExpenses(userId, req.params.id, today)
      : null;
    if (!found) {
      return res.status(404).json({ ok: false, error: 'challenge not found' });
    }
    return res.json({ ok: true, ...found });
  } catch (e) {
    return fail(res, '[GET /api/challenges/:id Error]', e);
  }
});

/**
 * POST /api/challenges/:id/giveup
 * Body: { uid, today? }
 */
router.post('/:id/giveup', async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ ok: false, error: 'missing fields (uid)' });
    const today = resolveToday(req.body.today);

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const done = isChallengeId(req.params.id)
      && (await challenges.giveUp(userId, req.params.id, today));
    if (!done) {
      return res.status(404).json({ ok: false, error: 'active challenge not found' });
    }
    return res.json({ ok: true });
  } catch (e) {
    return fail(res, '[POST /api/challenges/:id/giveup Error]', e);
  }
});

module.exports = router;
