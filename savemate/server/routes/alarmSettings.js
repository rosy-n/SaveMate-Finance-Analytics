// server/routes/alarmSettings.js
const express = require('express');
const router = express.Router();

const alarmSettings = require('../db/alarmSettings');
const { fail, badRequest } = require('../lib/http');

const TIME_OPTIONS = ['9시', '12시', '15시', '18시', '21시'];

/**
 * GET /api/alarm-settings
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    const settings = await alarmSettings.getSettings(userId);
    res.json({ ok: true, settings });
  } catch (e) {
    fail(res, '[alarmSettings.get]', e);
  }
});

/**
 * PUT /api/alarm-settings
 * body: { enabled, reminderEnabled, times: string[] }
 */
router.put('/', async (req, res) => {
  try {
    const { enabled, reminderEnabled, times } = req.body || {};
    if (!Array.isArray(times) || times.some((t) => !TIME_OPTIONS.includes(t))) {
      throw badRequest('알림 시간 값이 올바르지 않습니다.');
    }

    const userId = req.userId;

    const settings = await alarmSettings.upsertSettings(userId, {
      enabled: !!enabled,
      reminderEnabled: !!reminderEnabled,
      times,
    });

    res.json({ ok: true, settings });
  } catch (e) {
    fail(res, '[alarmSettings.put]', e);
  }
});

module.exports = router;
