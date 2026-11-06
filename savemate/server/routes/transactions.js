// server/routes/transactions.js
const express = require('express');
const router = express.Router();

const tx = require('../db/transactions');
const cache = require('../db/cache');
const { toKstDateString } = require('../lib/dates');
const { userOr404, fail } = require('../lib/http');

/**
 * POST /api/transactions
 * Body (앱에서 보내는 값 기준):
 *  - uid          (필수)
 *  - type         'income' | 'expense' (필수)
 *  - amount       숫자 (필수)
 *  - category     (선택)
 *  - memo         (선택)
 *  - date         'YYYY-MM-DD' 또는 ISO 문자열 (선택, 없으면 서버 현재 날짜)
 *  - method       (지출 수단: 현금/신용카드/체크카드) or paymentMethod
 *  - background   (소비 배경) or spendingBackground
 *  - incomeDetail: { incomeSource, memo } (선택)
 *  - incomeSource (선택, 상위 필드로 직접 보낼 수도 있음)
 */
router.post('/', async (req, res) => {
  try {
    const {
      uid,
      amount,
      type,
      category,
      memo,
      date,
      occurredAt,
      method,
      paymentMethod,
      background,
      spendingBackground,
      incomeDetail,
      incomeSource,
    } = req.body;

    if (!uid || !amount || !type) {
      return res.status(400).json({ ok: false, error: 'missing fields (uid, amount, type)' });
    }
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ ok: false, error: "type must be 'income' or 'expense'" });
    }

    const amt = Math.round(Number(amount));
    if (!Number.isFinite(amt)) {
      return res.status(400).json({ ok: false, error: 'amount must be a number' });
    }

    // 날짜 파싱: occurredAt > date > now 순으로 사용
    const base = occurredAt ? new Date(occurredAt) : date ? new Date(date) : new Date();
    if (!Number.isFinite(base.getTime())) {
      return res.status(400).json({ ok: false, error: 'invalid date/occurredAt' });
    }
    const occurredOn = toKstDateString(base);

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const id = await tx.create({
      userId,
      type,
      amount: amt,
      category,
      memo,
      occurredOn,
      paymentMethod: paymentMethod ?? method ?? null,
      spendingBackground: spendingBackground ?? background ?? null,
      incomeSource: incomeSource ?? incomeDetail?.incomeSource ?? null,
    });

    // 🔁 이 거래가 속한 월의 LLM 소비 리포트 캐시 무효화
    cache.deleteReportByDate(userId, occurredOn).catch(() => {});

    res.status(201).json({ ok: true, id });
  } catch (e) {
    fail(res, '[POST /api/transactions Error]', e);
  }
});

// 만족도평가를 위해 미평가 지출을 불러오기
router.get('/unrated', async (req, res) => {
  try {
    const { uid, limit = 50 } = req.query;
    if (!uid) return res.status(400).json({ ok: false, error: 'uid required' });

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const items = await tx.listUnrated(userId, Math.min(Math.max(Number(limit) || 50, 1), 500));
    res.json({ ok: true, items });
  } catch (e) {
    fail(res, '[GET /api/transactions/unrated Error]', e);
  }
});

/**
 * GET /api/transactions
 * 쿼리스트링: uid, year, month(1~12), expand(무시)
 * useMonthlyTransactionsFromApi, ReportHome 에서 사용
 */
router.get('/', async (req, res) => {
  try {
    const { uid, year, month } = req.query;
    const y = Number(year);
    const m = Number(month);

    if (!uid || !y || !m) {
      return res.status(400).json({ ok: false, error: 'uid, year, month are required' });
    }
    if (m < 1 || m > 12) {
      return res.status(400).json({ ok: false, error: 'month must be 1-12' });
    }

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const items = await tx.listByMonth(userId, y, m);
    res.json({ ok: true, items });
  } catch (e) {
    fail(res, '[GET /api/transactions Error]', e);
  }
});

/**
 * GET /api/transactions/monthly-sum
 * 쿼리스트링: uid, months(기본 4), endYear, endMonth
 * ReportHome 의 "월별 지출 추이" 꺾은선 그래프에서 사용
 */
router.get('/monthly-sum', async (req, res) => {
  try {
    const { uid, months = '4', endYear, endMonth } = req.query;
    const count = Math.min(Math.max(Number(months) || 4, 1), 36);
    const y0 = Number(endYear);
    const m0 = Number(endMonth);

    if (!uid || !y0 || !m0) {
      return res.status(400).json({ ok: false, error: 'uid, endYear, endMonth are required' });
    }

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const items = await tx.monthlyExpenseSums(userId, y0, m0, count);
    res.json({ ok: true, items });
  } catch (e) {
    fail(res, '[GET /api/transactions/monthly-sum Error]', e);
  }
});

// transactions bulk 조회 (지출배경 분석에서 사용)
router.post('/bulk', async (req, res) => {
  try {
    const { ids, uid } = req.body;

    if (!uid) return res.status(400).json({ ok: false, error: 'uid required' });
    if (!Array.isArray(ids)) {
      return res.status(400).json({ ok: false, error: 'ids must be an array' });
    }

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const items = await tx.listByIds(userId, ids);
    res.json({ ok: true, items });
  } catch (e) {
    fail(res, '[POST /api/transactions/bulk Error]', e);
  }
});

/**
 * (기존) 특정 사용자 거래 전체 조회
 * GET /api/transactions/:uid
 */
router.get('/:uid', async (req, res) => {
  try {
    const userId = await userOr404(res, req.params.uid);
    if (!userId) return;

    const items = await tx.listAll(userId);
    res.json({ ok: true, items });
  } catch (e) {
    fail(res, '[GET /api/transactions/:uid Error]', e);
  }
});

/**
 * DELETE /api/transactions/:uid/:tid
 * 단일 거래 삭제 + 해당 월 LLM 리포트 캐시 무효화
 */
router.delete('/:uid/:tid', async (req, res) => {
  try {
    const { uid, tid } = req.params;

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const occurredOn = await tx.remove(userId, tid);
    if (occurredOn) {
      cache.deleteReportByDate(userId, occurredOn).catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) {
    fail(res, '[DELETE /api/transactions Error]', e);
  }
});

module.exports = router;
