// server/routes/health.js
const express = require('express');
const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ ok: true, message: 'healthy', ts: Date.now() });
});

module.exports = router;
