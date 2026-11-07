// server/db/seed.js
// 페르소나 더미데이터를 DB 에 넣는다. (db/seeds/personas/*.json)
//   npm run seed                전체 다시 넣기 (계정 유지, 거래/만족도/챌린지/캐시 교체)
//   npm run seed:accounts       계정 정보만 갱신 (로그인 방식이 확정됐을 때 사용)
//   npm run seed -- --month=2026-07   그 달의 거래/만족도만 교체 (다른 달과 계정, 챌린지는 유지)
// legacy_uid 가 persona_ 로 시작하는 계정만 건드리며, 전체가 하나의 트랜잭션으로 실행된다.
//
// 저장소가 공개이므로 비밀번호는 커밋하지 않는다. db/seeds/passwords.local.json (gitignore) 에
// { "persona_xxx": "비밀번호" } 로 두면 해시를 갱신하고, 없으면 기존 해시를 그대로 유지한다.
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

if (process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}
const { pool } = require('./pool');

const PERSONAS_DIR = path.join(__dirname, 'seeds', 'personas');
const PASSWORDS_FILE = path.join(__dirname, 'seeds', 'passwords.local.json');
const BCRYPT_ROUNDS = 10;
const accountsOnly = process.argv.includes('--accounts-only');
const month = process.argv.find((arg) => arg.startsWith('--month='))?.slice('--month='.length) ?? null;

function loadPersonas() {
  return fs.readdirSync(PERSONAS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(PERSONAS_DIR, f), 'utf8')));
}

function loadPasswords() {
  return fs.existsSync(PASSWORDS_FILE) ? JSON.parse(fs.readFileSync(PASSWORDS_FILE, 'utf8')) : {};
}

/** 첫 거래일 0시(KST)를 가입 시점으로 쓴다. 거래가 없으면 null. */
function firstTransactionAt(transactions) {
  const firstDate = transactions.map((t) => t.date).sort()[0];
  return firstDate ? `${firstDate}T00:00:00+09:00` : null;
}

async function upsertUser(client, account, password, joinedAt) {
  if (!account.legacyUid.startsWith('persona_')) {
    throw new Error(`persona_ 로 시작하지 않는 legacy_uid: ${account.legacyUid}`);
  }
  const hash = password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : null;
  const updated = await client.query(
    `UPDATE users
     SET username = $1, nickname = $2, email = $3, password_hash = COALESCE($4, password_hash),
         created_at = COALESCE($6, created_at)
     WHERE legacy_uid = $5
     RETURNING id`,
    [account.username, account.nickname, account.email, hash, account.legacyUid, joinedAt]
  );
  if (updated.rows[0]) return updated.rows[0].id;

  if (!hash) throw new Error(`새 계정의 비밀번호가 ${path.basename(PASSWORDS_FILE)} 에 없습니다: ${account.legacyUid}`);
  const { rows } = await client.query(
    `INSERT INTO users (username, nickname, email, password_hash, legacy_uid, created_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))
     RETURNING id`,
    [account.username, account.nickname, account.email, hash, account.legacyUid, joinedAt]
  );
  return rows[0].id;
}

async function insertTransactions(client, userId, transactions, categoryIds) {
  for (const t of transactions) {
    const { rows } = await client.query(
      `INSERT INTO transactions
         (user_id, type, amount, category_id, memo, occurred_on,
          payment_method, spending_background, income_source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       RETURNING id`,
      [userId, t.type, t.amount, categoryIds.get(t.category), t.memo, t.date,
        t.paymentMethod ?? null, t.spendingBackground ?? null, t.incomeSource ?? null, t.createdAt]
    );
    if (!t.rating) continue;

    const rating = await client.query(
      `INSERT INTO satisfaction_ratings (transaction_id, emotion, memo, created_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [rows[0].id, t.rating.emotion, t.rating.memo ?? '', t.rating.createdAt]
    );
    await client.query(
      'INSERT INTO satisfaction_reasons (rating_id, reason) SELECT $1, unnest($2::text[])',
      [rating.rows[0].id, t.rating.reasons]
    );
  }
}

/** 한 달치 거래/만족도만 교체한다. 계정이 없으면 실패한다. */
async function replaceMonth(client, persona, categoryIds) {
  const { rows } = await client.query('SELECT id FROM users WHERE legacy_uid = $1', [persona.account.legacyUid]);
  if (!rows[0]) throw new Error(`계정이 없습니다: ${persona.account.legacyUid}`);
  const userId = rows[0].id;
  const firstDay = `${month}-01`;

  await client.query(
    `DELETE FROM transactions
     WHERE user_id = $1 AND occurred_on >= $2::date AND occurred_on < ($2::date + interval '1 month')`,
    [userId, firstDay]
  );
  await client.query('DELETE FROM report_cache WHERE user_id = $1 AND year_month = $2::date', [userId, firstDay]);

  const transactions = persona.transactions.filter((t) => t.date.startsWith(month));
  await insertTransactions(client, userId, transactions, categoryIds);
  return transactions.length;
}

async function replaceData(client, userId, persona, categoryIds) {
  for (const table of ['transactions', 'challenges', 'report_cache', 'tip_cache']) {
    await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
  }

  await insertTransactions(client, userId, persona.transactions, categoryIds);

  // status 는 'active' 로 두고 완료/실패는 조회 시 계산한다. (db/challenges.js)
  for (const c of persona.challenges) {
    await client.query(
      `INSERT INTO challenges (user_id, category_id, target_amount, period_start, period_end, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, categoryIds.get(c.category), c.targetAmount, c.periodStart, c.periodEnd, c.createdAt]
    );
  }
}

async function main() {
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error(`--month 형식이 잘못됐습니다: ${month} (예: 2026-07)`);
  }
  const personas = loadPersonas();
  const passwords = loadPasswords();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id, name FROM categories');
    const categoryIds = new Map(rows.map((r) => [r.name, r.id]));

    for (const persona of personas) {
      if (month) {
        const count = await replaceMonth(client, persona, categoryIds);
        console.log(`[seed] ${persona.account.legacyUid}: ${month} 거래 ${count}건`);
        continue;
      }
      const userId = await upsertUser(
        client,
        persona.account,
        passwords[persona.account.legacyUid],
        firstTransactionAt(persona.transactions)
      );
      if (!accountsOnly) await replaceData(client, userId, persona, categoryIds);
      console.log(
        `[seed] ${persona.account.legacyUid}: ` +
        (accountsOnly
          ? '계정 갱신'
          : `거래 ${persona.transactions.length}건, 챌린지 ${persona.challenges.length}건`)
      );
    }
    await client.query('COMMIT');
    console.log('[seed] done');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[seed] FAILED, 전체 롤백: ${e.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
