// server/routes/feedback.js
const express = require('express');
const router = express.Router();

const feedback = require('../db/feedback');
const { userOr404, fail, badRequest } = require('../lib/http');

const CATEGORIES = ['오류 신고', '기능 제안', '기타'];

/**
 * POST /api/feedback
 * body: { uid, category, title, content, email? }
 */
router.post('/', async (req, res) => {
  try {
    const { uid, category, title, content, email } = req.body || {};

    if (!uid) throw badRequest('uid가 필요합니다.');
    if (!CATEGORIES.includes(category)) throw badRequest('문의 유형을 선택해 주세요.');
    if (!title || !title.trim()) throw badRequest('제목을 입력해 주세요.');
    if (!content || !content.trim()) throw badRequest('내용을 입력해 주세요.');

    const userId = await userOr404(res, uid);
    if (!userId) return;

    const row = await feedback.createFeedback({
      userId,
      category,
      title: title.trim(),
      content: content.trim(),
      contactEmail: email?.trim() || null,
    });

    res.status(201).json({ ok: true, feedback: row });
  } catch (e) {
    fail(res, '[feedback.create]', e);
  }
});

module.exports = router;
