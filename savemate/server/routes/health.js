// server/routes/health.js

console.log('[health.js] loaded');


const express = require('express');
const router = express.Router();

// ✅ GET /api/health
router.get('/', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

module.exports = router;
