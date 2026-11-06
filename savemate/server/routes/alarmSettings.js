// server/routes/alarmSettings.js
const express = require('express');
const router = express.Router();

const alarmSettings = require('../db/alarmSettings');
const { userOr404, fail, badRequest } = require('../lib/http');

const TIME_OPTIONS = ['9시', '12시', '15시', '18시', '21시'];

/**
 * GET /api/alarm-settings?uid=...
 */
router.get('/', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) throw badRequest('uid가 필요합니다.');

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const settings = await alarmSettings.getSettings(userId);
    res.json({ ok: true, settings });
  } catch (e) {
    fail(res, '[alarmSettings.get]', e);
  }
});

/**
 * PUT /api/alarm-settings
 * body: { uid, enabled, reminderEnabled, times: string[] }
 */
router.put('/', async (req, res) => {
  try {
    const { uid, enabled, reminderEnabled, times } = req.body || {};
    if (!uid) throw badRequest('uid가 필요합니다.');
    if (!Array.isArray(times) || times.some((t) => !TIME_OPTIONS.includes(t))) {
      throw badRequest('알림 시간 값이 올바르지 않습니다.');
    }

    const userId = await userOr404(res, uid);
    if (!userId) return;

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
