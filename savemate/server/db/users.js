// server/db/users.js
const { query } = require('./pool');

const PUBLIC_FIELDS = 'id, username, nickname, email, avatar_url, created_at';

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
  const sql = `SELECT ${PUBLIC_FIELDS}, password_hash FROM users WHERE lower(username) = lower($1)`;
  const { rows } = await query(sql, [username]);
  return rows[0] ?? null;
}

async function findPublicById(id) {
  const sql = `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`;
  const { rows } = await query(sql, [id]);
  return rows[0] ?? null;
}

module.exports = {
  createUser,
  findByUsernameWithPassword,
  findPublicById,
};
