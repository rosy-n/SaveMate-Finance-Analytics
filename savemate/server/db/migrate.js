// server/db/migrate.js
// 사용법: npm run migrate
// db/migrations/*.sql 을 파일명 순서대로 실행하고, 적용한 파일은 schema_migrations 에 기록한다.
// 각 파일은 하나의 트랜잭션으로 실행되어, 중간에 실패하면 해당 파일 전체가 롤백된다.
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// 스키마 변경(DDL)은 커넥션 풀러를 거치지 않는 직접 연결을 우선 사용한다.
if (process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}
const { pool } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const done = new Set(
      (await client.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
    );
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

    let applied = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrate] applying ${file} ...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied++;
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`[migrate] FAILED ${file}: ${e.message}`);
        process.exitCode = 1;
        return;
      }
    }
    console.log(applied ? `[migrate] done (${applied} applied)` : '[migrate] up to date');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
