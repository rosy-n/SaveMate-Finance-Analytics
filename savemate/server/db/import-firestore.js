// server/db/import-firestore.js
// Firestore(users/{uid}/...) -> PostgreSQL 데이터 이전 스크립트
//
// 사용법 (server 폴더에서):
//   node db/import-firestore.js --dry-run        DB 를 바꾸지 않고 변환/검증만 수행
//   node db/import-firestore.js                  이전 실행 (이미 이전된 사용자는 건너뜀)
//   node db/import-firestore.js --reset          이미 이전된 사용자의 거래/평가를 지우고 다시 이전
//   node db/import-firestore.js --uids 2312399,2314513   일부 사용자만
//
// 이전 대상: users/{uid}/transactions, users/{uid}/satisfactionRatings
// 이전하지 않는 것: cachedReports / cachedTips (LLM 캐시. 기존 거래 id 를 참조하므로 새로 생성되게 둔다)
//                    최상위 transactions / satisfactionRatings (테스트 문서)
require('dotenv').config();
// 대량 쓰기는 커넥션 풀러를 거치지 않는 직접 연결을 사용한다.
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const { db } = require('../firebaseAdmin');
const { pool } = require('./pool');
const { toKstDateString } = require('../lib/dates');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const RESET = args.includes('--reset');
const uidsArg = args.includes('--uids') ? args[args.indexOf('--uids') + 1] : null;

const METHODS = new Set(['현금', '신용카드', '체크카드']);
const BACKGROUNDS = new Set(['필수/생존', '사회/관계', '자아실현/자기계발', '쾌락/감정', '여가', '자기표현/이미지·SNS', '투자(저축)/미래지향']);
const INCOME_SOURCES = new Set(['월급', '용돈', '기타']);
const EMOTIONS = new Set(['dissatisfied', 'neutral', 'satisfied']);

const toDate = (v) => {
  if (!v) return null;
  const d = v.toDate ? v.toDate() : new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

const usernameFor = (uid) => `user_${String(uid).replace(/[^A-Za-z0-9_]/g, '_')}`.slice(0, 20);

async function findUids() {
  if (uidsArg) return uidsArg.split(',').map((s) => s.trim()).filter(Boolean);
  // users/{uid} 문서는 필드가 없는 경우가 많아 listDocuments 로 찾고, 데이터(하위 컬렉션)가 있는 uid 만 대상으로 한다.
  const refs = await db.collection('users').listDocuments();
  const uids = [];
  for (const ref of refs) {
    if ((await ref.listCollections()).length > 0) uids.push(ref.id);
  }
  return uids;
}

// Firestore 데이터를 먼저 전부 읽어 둔다. (DB 트랜잭션을 연 채로 느린 외부 호출을 하지 않기 위해)
async function fetchUser(uid) {
  const txSnap = await db.collection('users').doc(uid).collection('transactions').get();
  const ratSnap = await db.collection('users').doc(uid).collection('satisfactionRatings').get();
  return {
    txDocs: txSnap.docs
      .map((d) => ({ id: d.id, x: d.data() }))
      .sort((a, b) => (toDate(a.x.createdAt) ?? 0) - (toDate(b.x.createdAt) ?? 0)),
    ratings: ratSnap.docs
      .map((d) => d.data())
      .sort((a, b) => (toDate(a.createdAt) ?? 0) - (toDate(b.createdAt) ?? 0)),
  };
}

async function importUser(client, uid, categoryIds, data) {
  const s = {
    uid,
    fsTx: 0, txOk: 0, txSkipped: [], expectedSum: 0,
    fsRatings: 0, ratingsOk: 0, ratingsDup: 0, ratingsOrphan: 0, ratingsInvalid: 0,
    categoryFallback: 0, status: 'imported',
  };

  // 1) 사용자 (로그인 정보는 회원가입 기능 담당 팀원이 처리. 임시 계정이라 비밀번호로는 로그인할 수 없다)
  let r = await client.query(
    `INSERT INTO users (username, nickname, email, password_hash, legacy_uid)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (legacy_uid) DO NOTHING RETURNING id`,
    [usernameFor(uid), `사용자${uid}`.slice(0, 20), `legacy-${uid}@savemate.invalid`, '!migrated-account-no-password', uid]
  );
  if (r.rowCount === 0) r = await client.query('SELECT id FROM users WHERE legacy_uid = $1', [uid]);
  const userId = r.rows[0].id;

  const existing = (await client.query('SELECT count(*)::int n FROM transactions WHERE user_id = $1', [userId])).rows[0].n;
  if (existing > 0) {
    if (!RESET) { s.status = `건너뜀 (이미 거래 ${existing}건 존재, 다시 하려면 --reset)`; return s; }
    await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]); // 평가/사유는 연쇄 삭제
  }

  // 2) 거래
  const docs = data.txDocs;
  s.fsTx = docs.length;

  const idMap = new Map(); // Firestore 문서 id -> 새 id
  const rated = new Map(); // Firestore 문서 id -> 기존 isRated

  for (const { id, x } of docs) {
    const type = String(x.type || '').toLowerCase();
    if (type !== 'income' && type !== 'expense') { s.txSkipped.push(`${id}: type=${x.type}`); continue; }

    const amount = Math.round(Math.abs(Number(x.amount)));
    if (!(amount > 0)) { s.txSkipped.push(`${id}: amount=${x.amount}`); continue; }

    const when = toDate(x.date) ?? toDate(x.occurredAt) ?? toDate(x.createdAt);
    if (!when) { s.txSkipped.push(`${id}: 날짜 없음`); continue; }

    let categoryId = null;
    let incomeSource = null;
    let method = null;
    let background = null;
    if (type === 'income') {
      categoryId = categoryIds.get('수입');
      const cand = x.incomeSource ?? (INCOME_SOURCES.has(x.category) ? x.category : null);
      incomeSource = INCOME_SOURCES.has(cand) ? cand : null;
    } else {
      categoryId = categoryIds.get(x.category);
      if (categoryId === undefined) { categoryId = categoryIds.get('기타'); s.categoryFallback++; }
      method = METHODS.has(x.paymentMethod) ? x.paymentMethod : null;
      background = BACKGROUNDS.has(x.spendingBackground) ? x.spendingBackground : null;
    }

    const created = toDate(x.createdAt) ?? when;
    const updated = toDate(x.updatedAt) ?? created;

    const ins = await client.query(
      `INSERT INTO transactions
         (user_id, type, amount, category_id, memo, occurred_on, payment_method, spending_background, income_source, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [userId, type, amount, categoryId, String(x.memo ?? ''), toKstDateString(when), method, background, incomeSource, created, updated]
    );
    idMap.set(id, ins.rows[0].id);
    rated.set(id, x.isRated === true);
    s.txOk++;
    s.expectedSum += amount;
  }

  // 3) 만족도 평가 (거래 1건당 1개: 중복이면 가장 최근 것만 남김)
  const ratings = data.ratings;
  s.fsRatings = ratings.length;

  const seen = new Set();
  for (const x of ratings) {
    const newTxId = idMap.get(x.transactionId);
    if (!newTxId) { s.ratingsOrphan++; continue; }
    if (!EMOTIONS.has(x.emotion)) { s.ratingsInvalid++; continue; }
    if (seen.has(x.transactionId)) s.ratingsDup++;
    seen.add(x.transactionId);

    const rr = await client.query(
      `INSERT INTO satisfaction_ratings (transaction_id, emotion, memo, created_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (transaction_id)
       DO UPDATE SET emotion = EXCLUDED.emotion, memo = EXCLUDED.memo, created_at = EXCLUDED.created_at
       RETURNING id`,
      [newTxId, x.emotion, String(x.memo ?? ''), toDate(x.createdAt) ?? new Date()]
    );
    const ratingId = rr.rows[0].id;
    await client.query('DELETE FROM satisfaction_reasons WHERE rating_id = $1', [ratingId]);
    const reasons = [...new Set((Array.isArray(x.reasons) ? x.reasons : []).map(String))];
    if (reasons.length) {
      await client.query('INSERT INTO satisfaction_reasons (rating_id, reason) SELECT $1, unnest($2::text[])', [ratingId, reasons]);
    }
  }
  s.ratingsOk = seen.size;

  // 4) 기존 isRated 플래그와 평가 존재 여부 불일치(참고용). 새 구조에서는 평가 존재 여부로 판단한다.
  s.ratedFlagNoRating = [...rated.entries()].filter(([id, v]) => v && !seen.has(id)).length;

  // 5) 검증: DB 에 들어간 건수/금액이 변환 결과와 같은지
  const v = (await client.query(
    'SELECT count(*)::int n, COALESCE(sum(amount),0)::bigint sum FROM transactions WHERE user_id = $1', [userId]
  )).rows[0];
  const vr = (await client.query(
    `SELECT count(*)::int n FROM satisfaction_ratings r JOIN transactions t ON t.id = r.transaction_id WHERE t.user_id = $1`, [userId]
  )).rows[0].n;
  s.verified = Number(v.n) === s.txOk && Number(v.sum) === s.expectedSum && vr === s.ratingsOk;
  return s;
}

async function main() {
  console.log(`[import] 모드: ${DRY_RUN ? 'DRY-RUN (DB 변경 없음)' : RESET ? '실행 (--reset)' : '실행'}`);
  const uids = await findUids();
  console.log(`[import] 대상 uid ${uids.length}개: ${uids.join(', ')}`);

  // 1단계: Firestore 에서 전부 읽기
  const fetched = new Map();
  for (const uid of uids) {
    fetched.set(uid, await fetchUser(uid));
    const d = fetched.get(uid);
    console.log(`[import] 읽음 uid ${uid}: 거래 ${d.txDocs.length}건, 평가 ${d.ratings.length}건`);
  }

  // 2단계: DB 에 쓰기 (하나의 트랜잭션)
  const client = await pool.connect();
  const summaries = [];
  try {
    await client.query('BEGIN');
    const categoryIds = new Map((await client.query('SELECT id, name FROM categories')).rows.map((r) => [r.name, r.id]));

    for (const uid of uids) summaries.push(await importUser(client, uid, categoryIds, fetched.get(uid)));

    const failed = summaries.filter((s) => s.verified === false);
    if (failed.length) throw new Error(`검증 실패: ${failed.map((s) => s.uid).join(', ')}`);

    if (DRY_RUN) { await client.query('ROLLBACK'); console.log('[import] DRY-RUN 이라 롤백했습니다.'); }
    else { await client.query('COMMIT'); console.log('[import] 커밋 완료'); }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[import] 실패, 전체 롤백:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }

  for (const s of summaries) {
    console.log(`\n■ uid ${s.uid}  →  ${s.status}`);
    if (s.status !== 'imported') continue;
    console.log(`  거래   : Firestore ${s.fsTx}건 → 이전 ${s.txOk}건 (금액 합계 ${s.expectedSum.toLocaleString()}원)`);
    if (s.txSkipped.length) console.log(`  제외   : ${s.txSkipped.join(' | ')}`);
    if (s.categoryFallback) console.log(`  카테고리 없음/미등록 → '기타' 처리: ${s.categoryFallback}건`);
    console.log(`  평가   : Firestore ${s.fsRatings}건 → 이전 ${s.ratingsOk}건` +
      (s.ratingsDup ? ` (같은 거래 중복 ${s.ratingsDup}건은 최신 1건만)` : '') +
      (s.ratingsOrphan ? ` (거래 없음 ${s.ratingsOrphan}건 제외)` : '') +
      (s.ratingsInvalid ? ` (감정값 오류 ${s.ratingsInvalid}건 제외)` : ''));
    if (s.ratedFlagNoRating) console.log(`  참고   : 기존 isRated=true 이지만 평가 기록이 없는 거래 ${s.ratedFlagNoRating}건 (새 구조에서는 미평가로 표시됨)`);
    console.log(`  검증   : DB 건수/금액 일치 ${s.verified ? '✅' : '❌'}`);
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
