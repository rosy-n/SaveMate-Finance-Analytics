// server/routes/auth.js
const express = require('express');
const router = express.Router();

const users = require('../db/users');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('../lib/auth');
const { fail, badRequest } = require('../lib/http');

const USERNAME_RE = /^[A-Za-z0-9_]{4,20}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * POST /api/auth/signup
 * body: { username, password, nickname, email }
 */
router.post('/signup', async (req, res) => {
  try {
    const { username, password, nickname, email } = req.body || {};

    if (!username || !password || !nickname || !email) {
      throw badRequest('아이디, 비밀번호, 닉네임, 이메일을 모두 입력해 주세요.');
    }
    if (!USERNAME_RE.test(username)) {
      throw badRequest('아이디는 영문/숫자/밑줄 4~20자로 입력해 주세요.');
    }
    if (String(password).length < 8) {
      throw badRequest('비밀번호는 8자 이상이어야 해요.');
    }
    if (nickname.length < 2 || nickname.length > 20) {
      throw badRequest('닉네임은 2~20자로 입력해 주세요.');
    }
    if (!EMAIL_RE.test(email)) {
      throw badRequest('이메일 형식이 올바르지 않아요.');
    }

    const password_hash = await hashPassword(password);
    const user = await users.createUser({ username, password_hash, nickname, email });
    const token = signToken(user.id);

    res.status(201).json({ ok: true, user, token });
  } catch (e) {
    if (e && e.code === '23505') {
      return res.status(409).json({ ok: false, error: '이미 사용 중인 아이디 또는 이메일이에요.' });
    }
    fail(res, '[auth.signup]', e);
  }
});

/**
 * POST /api/auth/login
 * body: { username, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      throw badRequest('아이디와 비밀번호를 입력해 주세요.');
    }

    const row = await users.findByUsernameWithPassword(username);
    const ok = row ? await verifyPassword(password, row.password_hash) : false;
    if (!ok) {
      throw badRequest('아이디 또는 비밀번호가 올바르지 않아요.');
    }

    const { password_hash, ...user } = row;
    const token = signToken(user.id);

    res.json({ ok: true, user, token });
  } catch (e) {
    fail(res, '[auth.login]', e);
  }
});

/**
 * GET /api/auth/me
 * header: Authorization: Bearer <token>
 * 저장된 토큰으로 자동 로그인을 복원할 때 사용한다.
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) throw badRequest('토큰이 없어요.');

    let userId;
    try {
      userId = verifyToken(token);
    } catch {
      throw badRequest('토큰이 유효하지 않아요.');
    }

    const user = await users.findPublicById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'user not found' });

    res.json({ ok: true, user });
  } catch (e) {
    fail(res, '[auth.me]', e);
  }
});

module.exports = router;
