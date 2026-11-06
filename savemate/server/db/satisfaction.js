// server/db/satisfaction.js
// 만족도 평가. 기존 응답 모양({ id, transactionId, emotion, reasons[], memo, createdAt })을 유지한다.
const { pool, query } = require('./pool');
const { isNumericId } = require('./transactions');

const SELECT_RATINGS = `
  SELECT r.id, r.transaction_id, r.emotion, r.memo, r.created_at,
         COALESCE(array_agg(s.reason ORDER BY s.reason) FILTER (WHERE s.reason IS NOT NULL), '{}') AS reasons
  FROM satisfaction_ratings r
  JOIN transactions t ON t.id = r.transaction_id
  LEFT JOIN satisfaction_reasons s ON s.rating_id = r.id`;

const toApi = (r) => ({
  id: String(r.id),
  transactionId: String(r.transaction_id),
  emotion: r.emotion,
  reasons: r.reasons,
  memo: r.memo,
  createdAt: r.created_at.toISOString(),
});

/**
 * 평가 저장(거래 1건당 1개, 다시 평가하면 덮어쓴다).
 * 해당 사용자의 거래가 아니면 null, 성공하면 { id, occurredOn }.
 */
async function upsert({ userId, transactionId, emotion, reasons, memo }) {
  if (!isNumericId(transactionId)) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tx = await client.query(
      'SELECT occurred_on::text AS occurred_on FROM transactions WHERE id = $1 AND user_id = $2',
      [transactionId, userId]
    );
    if (tx.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const rating = await client.query(
      `INSERT INTO satisfaction_ratings (transaction_id, emotion, memo)
       VALUES ($1, $2, $3)
       ON CONFLICT (transaction_id)
       DO UPDATE SET emotion = EXCLUDED.emotion, memo = EXCLUDED.memo, created_at = now()
       RETURNING id`,
      [transactionId, emotion, memo ?? '']
    );
    const ratingId = rating.rows[0].id;

    await client.query('DELETE FROM satisfaction_reasons WHERE rating_id = $1', [ratingId]);
    const uniqueReasons = [...new Set(reasons.map((r) => String(r)))];
    if (uniqueReasons.length > 0) {
      await client.query(
        'INSERT INTO satisfaction_reasons (rating_id, reason) SELECT $1, unnest($2::text[])',
        [ratingId, uniqueReasons]
      );
    }

    await client.query('COMMIT');
    return { id: String(ratingId), occurredOn: tx.rows[0].occurred_on };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** 사용자의 모든 평가 (최신순) */
async function listByUser(userId) {
  const { rows } = await query(
    `${SELECT_RATINGS} WHERE t.user_id = $1 GROUP BY r.id ORDER BY r.created_at DESC`,
    [userId]
  );
  return rows.map(toApi);
}

/** 주어진 거래들에 대한 평가 */
async function listForTransactions(userId, transactionIds) {
  const ids = [...new Set(transactionIds.filter(isNumericId).map(String))];
  if (ids.length === 0) return [];
  const { rows } = await query(
    `${SELECT_RATINGS}
     WHERE t.user_id = $1 AND r.transaction_id = ANY($2::bigint[])
     GROUP BY r.id ORDER BY r.created_at DESC`,
    [userId, ids]
  );
  return rows.map(toApi);
}

module.exports = { upsert, listByUser, listForTransactions };
