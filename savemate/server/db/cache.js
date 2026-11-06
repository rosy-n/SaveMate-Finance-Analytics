// server/db/cache.js
// 제미나이가 만든 JSON 을 가공 없이 통째로 저장/반환한다. (LLM 연동 방식은 그대로)
const { query } = require('./pool');
const { monthStart, monthStartOf } = require('../lib/dates');

// ── 월간 소비 리포트 ──
async function getReport(userId, year, month) {
  const { rows } = await query(
    'SELECT content FROM report_cache WHERE user_id = $1 AND year_month = $2::date',
    [userId, monthStart(year, month)]
  );
  return rows[0]?.content ?? null;
}

async function setReport(userId, year, month, content, model) {
  await query(
    `INSERT INTO report_cache (user_id, year_month, content, model)
     VALUES ($1, $2::date, $3::jsonb, $4)
     ON CONFLICT (user_id, year_month)
     DO UPDATE SET content = EXCLUDED.content, model = EXCLUDED.model, created_at = now()`,
    [userId, monthStart(year, month), JSON.stringify(content), model ?? null]
  );
}

/** 거래 날짜('YYYY-MM-DD')가 속한 달의 리포트 캐시 삭제 */
async function deleteReportByDate(userId, ymd) {
  try {
    await query('DELETE FROM report_cache WHERE user_id = $1 AND year_month = $2::date', [
      userId,
      monthStartOf(ymd),
    ]);
  } catch (e) {
    // 캐시 삭제 실패 때문에 저장/삭제 자체가 실패하면 안 되므로 경고만
    console.warn('[REPORT CACHE] invalidate failed:', e.message || e);
  }
}

// ── 오늘의 절약팁 ──
async function getTip(userId, ymd) {
  const { rows } = await query(
    'SELECT content FROM tip_cache WHERE user_id = $1 AND tip_date = $2::date',
    [userId, ymd]
  );
  return rows[0]?.content ?? null;
}

async function setTip(userId, ymd, content, model) {
  await query(
    `INSERT INTO tip_cache (user_id, tip_date, content, model)
     VALUES ($1, $2::date, $3::jsonb, $4)
     ON CONFLICT (user_id, tip_date)
     DO UPDATE SET content = EXCLUDED.content, model = EXCLUDED.model, created_at = now()`,
    [userId, ymd, JSON.stringify(content), model ?? null]
  );
}

module.exports = { getReport, setReport, deleteReportByDate, getTip, setTip };
