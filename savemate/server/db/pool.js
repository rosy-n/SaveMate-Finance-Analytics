// server/db/pool.js
// PostgreSQL 연결 풀 (Neon 등 DATABASE_URL 사용)
require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL이 .env에 없습니다. (예: postgresql://user:pass@host/db?sslmode=require)');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  keepAlive: true,
});

// 유휴 연결이 끊겨도 프로세스가 죽지 않도록 (다음 요청에서 새 연결을 만든다)
pool.on('error', (err) => console.warn('[pg pool] idle client error:', err.message));

module.exports = { pool, query: (text, params) => pool.query(text, params) };
