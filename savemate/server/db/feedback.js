// server/db/feedback.js
const { query } = require('./pool');

async function createFeedback({ userId, category, title, content, contactEmail }) {
  const sql = `
    INSERT INTO feedback (user_id, category, title, content, contact_email)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, created_at
  `;
  const { rows } = await query(sql, [userId, category, title, content, contactEmail || null]);
  return rows[0];
}

module.exports = { createFeedback };
