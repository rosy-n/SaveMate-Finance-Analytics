// server/db/users.js
const { query } = require('./pool');

const PUBLIC_FIELDS = 'id, username, nickname, email, avatar_url, created_at';
const PUBLIC_SELECT_FIELDS = `
  u.id, u.username, u.nickname, u.email, u.avatar_url, u.created_at,
  LEAST(
    u.created_at,
    COALESCE(
      (SELECT MIN(t.occurred_on)::timestamp AT TIME ZONE 'Asia/Seoul'
       FROM transactions t
       WHERE t.user_id = u.id),
      u.created_at
    )
  ) AS member_since`;

async function createUser({ username, password_hash, nickname, email }) {
  const sql = `
    INSERT INTO users (username, password_hash, nickname, email)
    VALUES ($1, $2, $3, $4)
    RETURNING ${PUBLIC_FIELDS}
  `;
  const { rows } = await query(sql, [username, password_hash, nickname, email]);
  return rows[0];
}

async function findByUsernameWithPassword(username) {
  const sql = `SELECT ${PUBLIC_SELECT_FIELDS}, u.password_hash FROM users u WHERE lower(u.username) = lower($1)`;
  const { rows } = await query(sql, [username]);
  return rows[0] ?? null;
}

async function findPublicById(id) {
  const sql = `SELECT ${PUBLIC_SELECT_FIELDS} FROM users u WHERE u.id = $1`;
  const { rows } = await query(sql, [id]);
  return rows[0] ?? null;
}

module.exports = {
  createUser,
  findByUsernameWithPassword,
  findPublicById,
};
