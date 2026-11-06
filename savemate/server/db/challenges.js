// server/db/challenges.js
// 챌린지 조회/저장.
// 진행률은 저장하지 않고 transactions 의 (카테고리, 기간) 합계로 계산한다.
// status 컬럼에는 사용자의 선택인 'given_up' 만 기록하고, 'failed'/'completed' 는 조회 시 계산한다.
// (지난 거래를 수정/삭제해도 결과가 항상 실제 지출과 일치하도록)
const { query } = require('./pool');
const { monthStart, nextMonthStart, shiftYearMonth } = require('../lib/dates');
const { badRequest } = require('../lib/http');

const SELECT_CHALLENGE = `
  SELECT ch.id, c.name AS category, ch.target_amount,
         ch.period_start::text AS period_start,
         ch.period_end::text   AS period_end,
         ch.status,
         COALESCE(s.total, 0)::bigint AS spent
  FROM challenges ch
  JOIN categories c ON c.id = ch.category_id
  LEFT JOIN LATERAL (
    SELECT SUM(t.amount) AS total
    FROM transactions t
    WHERE t.user_id = ch.user_id
      AND t.type = 'expense'
      AND t.category_id = ch.category_id
      AND t.occurred_on BETWEEN ch.period_start AND ch.period_end
  ) s ON true`;

/** 저장된 status 와 지출 합계, 오늘 날짜('YYYY-MM-DD')로 현재 상태를 계산한다. */
function deriveStatus(row, spent, today) {
  if (row.status === 'given_up') return 'given_up';
  if (spent > row.target_amount) return 'failed';
  if (today > row.period_end) return 'completed';
  return 'active';
}

function toApi(row, today) {
  const spent = Number(row.spent);
  return {
    id: String(row.id),
    title: `${row.category} 챌린지`,
    category: row.category,
    targetAmount: row.target_amount,
    currentAmount: spent,
    progress: Math.round((spent / row.target_amount) * 100),
    status: deriveStatus(row, spent, today),
    periodStart: row.period_start,
    periodEnd: row.period_end,
  };
}

/** 챌린지로 선택할 수 있는 지출 카테고리 이름 목록 */
async function listCategories() {
  const { rows } = await query(
    "SELECT name FROM categories WHERE kind = 'expense' ORDER BY id"
  );
  return rows.map((r) => r.name);
}

/** 기간이 끝나지 않았고 포기하지 않은 챌린지 */
async function listCurrent(userId, today) {
  const { rows } = await query(
    `${SELECT_CHALLENGE}
     WHERE ch.user_id = $1 AND ch.status <> 'given_up' AND ch.period_end >= $2::date
     ORDER BY ch.id`,
    [userId, today]
  );
  return rows.map((r) => toApi(r, today));
}

/** 내 챌린지 1건과 기간 내 지출 내역(최신순). 없으면 null */
async function getWithExpenses(userId, id, today) {
  const { rows } = await query(
    `${SELECT_CHALLENGE} WHERE ch.id = $1 AND ch.user_id = $2`,
    [id, userId]
  );
  if (!rows[0]) return null;

  const expenses = await query(
    `SELECT t.id, t.memo, t.amount, t.occurred_on::text AS occurred_on
     FROM transactions t
     JOIN challenges ch ON ch.user_id = t.user_id AND ch.category_id = t.category_id
     WHERE ch.id = $1
       AND t.type = 'expense'
       AND t.occurred_on BETWEEN ch.period_start AND ch.period_end
     ORDER BY t.occurred_on DESC, t.id DESC`,
    [id]
  );

  const challenge = toApi(rows[0], today);
  return {
    challenge,
    monthlyExpenses: expenses.rows.map((e) => ({
      id: String(e.id),
      // 거래에는 가게명 컬럼이 없어 메모를 표시한다.
      store: e.memo || challenge.category,
      date: e.occurred_on.replaceAll('-', '.'),
      amount: e.amount,
    })),
  };
}

/**
 * 오늘부터 그달 말일까지의 챌린지를 만든다.
 * 같은 카테고리에 끝나지 않은 챌린지가 있으면 만들지 않고 null 을 반환한다.
 */
async function create({ userId, category, targetAmount, today }) {
  const found = await query(
    "SELECT id FROM categories WHERE name = $1 AND kind = 'expense'",
    [category]
  );
  if (!found.rows[0]) throw badRequest(`unknown category: ${category}`);

  const { rows } = await query(
    `INSERT INTO challenges (user_id, category_id, target_amount, period_start, period_end)
     SELECT $1::uuid, $2::smallint, $3::integer, $4::date,
            (date_trunc('month', $4::timestamp) + interval '1 month - 1 day')::date
     WHERE NOT EXISTS (
       SELECT 1 FROM challenges
       WHERE user_id = $1::uuid AND category_id = $2::smallint
         AND status <> 'given_up' AND period_end >= $4::date
     )
     RETURNING id`,
    [userId, found.rows[0].id, targetAmount, today]
  );
  return rows[0] ? String(rows[0].id) : null;
}

/**
 * 기간이 끝나지 않은 챌린지를 포기 처리한다.
 * 처리되면 true, 대상이 없거나 이미 끝난 챌린지면 false.
 */
async function giveUp(userId, id, today) {
  const { rowCount } = await query(
    `UPDATE challenges SET status = 'given_up'
     WHERE id = $1 AND user_id = $2 AND status <> 'given_up' AND period_end >= $3::date`,
    [id, userId, today]
  );
  return rowCount > 0;
}

// 줄이기 어려운 고정 지출이나 성격이 불분명한 항목은 추천에서 제외한다.
const NOT_RECOMMENDED = ['공과금(주거/세금/통신/보험)', '카드대금(후불)', '투자/저축', '기타'];
const MIN_RECOMMEND_TOTAL = 10000;
const RECOMMEND_RATIO = 0.8;

/**
 * 지난달 지출이 가장 많은 카테고리를 추천한다. (이미 진행 중인 카테고리 제외)
 * 목표 금액은 지난달 지출의 80%를 만원 단위로 내림한 값. 추천할 항목이 없으면 null.
 */
async function recommend(userId, today) {
  const prev = shiftYearMonth(Number(today.slice(0, 4)), Number(today.slice(5, 7)), -1);
  const { rows } = await query(
    `SELECT c.name AS category, SUM(t.amount)::bigint AS total
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.type = 'expense'
       AND t.occurred_on >= $2::date AND t.occurred_on < $3::date
       AND c.name <> ALL($4::text[])
       AND NOT EXISTS (
         SELECT 1 FROM challenges ch
         WHERE ch.user_id = t.user_id AND ch.category_id = t.category_id
           AND ch.status <> 'given_up' AND ch.period_end >= $5::date
       )
     GROUP BY c.name
     HAVING SUM(t.amount) >= $6
     ORDER BY total DESC, c.name
     LIMIT 1`,
    [
      userId,
      monthStart(prev.year, prev.month),
      nextMonthStart(prev.year, prev.month),
      NOT_RECOMMENDED,
      today,
      MIN_RECOMMEND_TOTAL,
    ]
  );
  if (!rows[0]) return null;

  const lastMonthTotal = Number(rows[0].total);
  return {
    category: rows[0].category,
    lastMonthTotal,
    targetAmount: Math.max(
      MIN_RECOMMEND_TOTAL,
      Math.floor((lastMonthTotal * RECOMMEND_RATIO) / MIN_RECOMMEND_TOTAL) * MIN_RECOMMEND_TOTAL
    ),
  };
}

module.exports = { listCategories, listCurrent, getWithExpenses, create, giveUp, recommend };
