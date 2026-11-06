// server/db/transactions.js
// 거래 조회/저장. 기존 Firestore 응답과 같은 모양({ id, amount, type, category, memo, date, ... })으로 돌려준다.
const { query } = require('./pool');
const { monthStart, nextMonthStart, shiftYearMonth } = require('../lib/dates');
const { badRequest } = require('../lib/http');

const INCOME_SOURCES = ['월급', '용돈', '기타'];

// ── 카테고리 (고정 목록이라 한 번만 읽어 둔다) ──
let categoryIds = null;
async function loadCategories() {
  if (!categoryIds) {
    const { rows } = await query('SELECT id, name FROM categories');
    categoryIds = new Map(rows.map((r) => [r.name, r.id]));
  }
  return categoryIds;
}

async function resolveCategoryId(type, category) {
  const ids = await loadCategories();
  if (type === 'income') return ids.get('수입') ?? null;
  if (category == null || category === '') return null;
  const id = ids.get(category);
  if (id === undefined) throw badRequest(`unknown category: ${category}`);
  return id;
}

// ── 조회 공통 ──
const SELECT_TX = `
  SELECT t.id, t.type, t.amount, t.memo,
         t.occurred_on::text AS occurred_on,
         t.created_at, t.updated_at,
         t.payment_method, t.spending_background, t.income_source,
         c.name AS category_name,
         EXISTS (SELECT 1 FROM satisfaction_ratings r WHERE r.transaction_id = t.id) AS is_rated
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id`;

/** DB 행 -> 기존 API 응답 모양 */
function toApi(r) {
  const iso = `${r.occurred_on}T00:00:00.000Z`;
  return {
    id: String(r.id),
    amount: r.amount,
    type: r.type,
    // 수입은 기존처럼 '월급'/'용돈'/'기타' 를 category 로 내려준다.
    category: r.type === 'income' ? r.income_source ?? r.category_name : r.category_name,
    memo: r.memo,
    date: iso,
    occurredAt: iso,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    isRated: r.is_rated,
    incomeSource: r.income_source,
    paymentMethod: r.payment_method,
    spendingBackground: r.spending_background,
  };
}

const isNumericId = (v) => /^\d+$/.test(String(v));

// ── 저장 / 삭제 ──
async function create({ userId, type, amount, category, memo, occurredOn, paymentMethod, spendingBackground, incomeSource }) {
  const categoryId = await resolveCategoryId(type, category);

  let source = null;
  let method = null;
  let background = null;
  if (type === 'income') {
    source = incomeSource ?? (INCOME_SOURCES.includes(category) ? category : null);
  } else {
    method = paymentMethod ?? null;
    background = spendingBackground ?? null;
  }

  const { rows } = await query(
    `INSERT INTO transactions
       (user_id, type, amount, category_id, memo, occurred_on, payment_method, spending_background, income_source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [userId, type, amount, categoryId, memo ?? '', occurredOn, method, background, source]
  );
  return String(rows[0].id);
}

/** 삭제하고, 삭제된 거래의 날짜('YYYY-MM-DD')를 반환. 없으면 null */
async function remove(userId, id) {
  if (!isNumericId(id)) return null;
  const { rows } = await query(
    'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING occurred_on::text AS occurred_on',
    [id, userId]
  );
  return rows[0]?.occurred_on ?? null;
}

// ── 조회 ──
async function listByMonth(userId, year, month) {
  const { rows } = await query(
    `${SELECT_TX}
     WHERE t.user_id = $1 AND t.occurred_on >= $2::date AND t.occurred_on < $3::date
     ORDER BY t.occurred_on DESC, t.id DESC`,
    [userId, monthStart(year, month), nextMonthStart(year, month)]
  );
  return rows.map(toApi);
}

async function listAll(userId) {
  const { rows } = await query(
    `${SELECT_TX} WHERE t.user_id = $1 ORDER BY t.occurred_on DESC, t.id DESC`,
    [userId]
  );
  return rows.map(toApi);
}

/** 만족도 평가가 없는 지출 (최신순) */
async function listUnrated(userId, limit) {
  const { rows } = await query(
    `${SELECT_TX}
     WHERE t.user_id = $1 AND t.type = 'expense'
       AND NOT EXISTS (SELECT 1 FROM satisfaction_ratings r WHERE r.transaction_id = t.id)
     ORDER BY t.occurred_on DESC, t.id DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows.map(toApi);
}

/** since('YYYY-MM-DD') 이후 거래 (최신순, 모든 type) */
async function listSince(userId, since, limit) {
  const { rows } = await query(
    `${SELECT_TX}
     WHERE t.user_id = $1 AND t.occurred_on >= $2::date
     ORDER BY t.occurred_on DESC, t.id DESC
     LIMIT $3`,
    [userId, since, limit]
  );
  return rows.map(toApi);
}

async function listByIds(userId, ids) {
  const numeric = [...new Set(ids.filter(isNumericId).map(String))];
  if (numeric.length === 0) return [];
  const { rows } = await query(
    `${SELECT_TX} WHERE t.user_id = $1 AND t.id = ANY($2::bigint[])`,
    [userId, numeric]
  );
  return rows.map(toApi);
}

/**
 * 최근 count 개월(endYear/endMonth 포함)의 월별 지출 합계.
 * throughDay 를 주면 매월 1일부터 그 날짜까지의 합계(expenseThroughDay)도 함께 돌려준다.
 */
async function monthlyExpenseSums(userId, endYear, endMonth, count, throughDay = 31) {
  const months = [];
  for (let i = count - 1; i >= 0; i--) months.push(shiftYearMonth(endYear, endMonth, -i));

  const first = months[0];
  const last = months[months.length - 1];
  const { rows } = await query(
    `SELECT to_char(occurred_on, 'YYYY-MM') AS ym, SUM(amount)::int AS total,
            COALESCE(SUM(amount) FILTER (WHERE EXTRACT(DAY FROM occurred_on) <= $4), 0)::int AS through_day
     FROM transactions
     WHERE user_id = $1 AND type = 'expense' AND occurred_on >= $2::date AND occurred_on < $3::date
     GROUP BY 1`,
    [userId, monthStart(first.year, first.month), nextMonthStart(last.year, last.month), throughDay]
  );
  const byMonth = new Map(rows.map((r) => [r.ym, r]));

  return months.map(({ year, month }) => {
    const row = byMonth.get(`${year}-${String(month).padStart(2, '0')}`);
    return {
      year,
      month,
      totalExpense: row?.total ?? 0,
      expenseThroughDay: row?.through_day ?? 0,
    };
  });
}

module.exports = {
  create,
  remove,
  listByMonth,
  listAll,
  listUnrated,
  listSince,
  listByIds,
  monthlyExpenseSums,
  isNumericId,
};
