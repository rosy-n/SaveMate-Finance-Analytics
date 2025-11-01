// server/routes/health.js
const express = require('express');
const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

module.exports = router;
