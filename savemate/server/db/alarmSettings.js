// server/db/alarmSettings.js
const { query } = require('./pool');

const DEFAULTS = { enabled: true, reminder_enabled: true, times: ['9시'] };

async function getSettings(userId) {
  const { rows } = await query(
    'SELECT enabled, reminder_enabled, times FROM alarm_settings WHERE user_id = $1',
    [userId]
  );
  return rows[0] ?? DEFAULTS;
}

async function upsertSettings(userId, { enabled, reminderEnabled, times }) {
  const sql = `
    INSERT INTO alarm_settings (user_id, enabled, reminder_enabled, times)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      reminder_enabled = EXCLUDED.reminder_enabled,
      times = EXCLUDED.times
    RETURNING enabled, reminder_enabled, times
  `;
  const { rows } = await query(sql, [userId, enabled, reminderEnabled, times]);
  return rows[0];
}

module.exports = { getSettings, upsertSettings };
