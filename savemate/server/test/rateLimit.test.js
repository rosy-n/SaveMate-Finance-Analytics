// lib/rateLimit.js 테스트: 로그인 실패 횟수 제한과 회원가입 횟수 제한
const test = require('node:test');
const assert = require('node:assert/strict');

// rateLimit.js 는 불러올 때 한도를 읽으므로, 모듈을 불러오기 전에 작게 설정한다.
process.env.LOGIN_MAX_FAILURES = '3';
process.env.SIGNUP_MAX_PER_HOUR = '2';
const express = require('express');
const { loginLimiter, signupLimiter } = require('../lib/rateLimit');

// 실제 라우트 대신 body.ok 가 true 면 성공, 아니면 400 으로 응답하는 라우트를 붙인다.
function createApp() {
  const app = express();
  app.use(express.json());
  const handler = (req, res) =>
    req.body && req.body.ok ? res.json({ ok: true }) : res.status(400).json({ ok: false });
  app.post('/login', loginLimiter, handler);
  app.post('/signup', signupLimiter, handler);
  return app;
}

async function withServer(fn) {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) =>
    fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  try {
    await fn(post);
  } finally {
    server.close();
  }
}

// 한도 상태는 모듈(프로세스) 안에 남으므로, 아래 테스트는 순서대로 실행된다.

test('로그인: 성공한 요청은 횟수에 세지 않는다', async () => {
  await withServer(async (post) => {
    for (let i = 0; i < 6; i++) {
      assert.equal((await post('/login', { ok: true })).status, 200);
    }
  });
});

test('로그인: 실패가 한도(3회)를 넘으면 429 와 안내 문구', async () => {
  await withServer(async (post) => {
    assert.equal((await post('/login', { ok: false })).status, 400);
    assert.equal((await post('/login', { ok: false })).status, 400);
    assert.equal((await post('/login', { ok: false })).status, 400);

    const blocked = await post('/login', { ok: false });
    assert.equal(blocked.status, 429);
    const body = await blocked.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /로그인 시도가 너무 많아요/);
    assert.ok(blocked.headers.get('retry-after'), 'Retry-After 헤더가 있어야 한다');
  });
});

test('로그인: 한도를 넘으면 올바른 정보로도 차단된다', async () => {
  await withServer(async (post) => {
    assert.equal((await post('/login', { ok: true })).status, 429);
  });
});

test('회원가입: 요청 횟수가 한도(2회)를 넘으면 429 와 안내 문구', async () => {
  await withServer(async (post) => {
    assert.equal((await post('/signup', { ok: true })).status, 200);
    assert.equal((await post('/signup', { ok: true })).status, 200);

    const blocked = await post('/signup', { ok: true });
    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).error, /회원가입 요청이 너무 많아요/);
  });
});
