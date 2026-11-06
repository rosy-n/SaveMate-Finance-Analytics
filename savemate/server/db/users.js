// server/db/users.js
const { query } = require('./pool');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cache = new Map();

/**
 * 요청의 uid 를 users.id(uuid)로 변환한다.
 *  - uuid 형식이면 users.id 로 조회
 *  - 그 외에는 기존 Firestore uid(users.legacy_uid)로 조회
 * 없으면 null.
 */
async function resolveUserId(uid) {
  if (!uid) return null;
  const key = String(uid);
  if (cache.has(key)) return cache.get(key);

  const sql = UUID_RE.test(key)
    ? 'SELECT id FROM users WHERE id = $1'
    : 'SELECT id FROM users WHERE legacy_uid = $1';
  const { rows } = await query(sql, [key]);
  const id = rows[0]?.id ?? null;
  if (id) cache.set(key, id);
  return id;
}

const PUBLIC_FIELDS = 'id, username, nickname, email, created_at';

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
  resolveUserId,
  createUser,
  findByUsernameWithPassword,
  findPublicById,
};
