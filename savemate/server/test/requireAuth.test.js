// lib/requireAuth.js 테스트: Authorization Bearer 검증과 req.userId 설정
const test = require('node:test');
const assert = require('node:assert/strict');

// lib/auth.js 는 불러올 때 JWT_SECRET 을 읽으므로, 모듈을 불러오기 전에 설정한다.
process.env.JWT_SECRET = 'test-secret';
const jwt = require('jsonwebtoken');
const { signToken } = require('../lib/auth');
const { requireAuth } = require('../lib/requireAuth');

function run(headers = {}) {
  const req = { headers };
  const res = {
    code: null,
    body: null,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let nextCalled = false;
  requireAuth(req, res, () => { nextCalled = true; });
  return { req, res, nextCalled };
}

test('Authorization 헤더가 없으면 401', () => {
  const { res, nextCalled } = run();
  assert.equal(res.code, 401);
  assert.equal(res.body.ok, false);
  assert.equal(nextCalled, false);
});

test('Bearer 방식이 아니면 401', () => {
  const token = signToken('user-1');
  const { res, nextCalled } = run({ authorization: `Basic ${token}` });
  assert.equal(res.code, 401);
  assert.equal(nextCalled, false);
});

test('토큰이 비어 있으면 401', () => {
  const { res, nextCalled } = run({ authorization: 'Bearer ' });
  assert.equal(res.code, 401);
  assert.equal(nextCalled, false);
});

test('형식이 잘못된 토큰은 401', () => {
  const { res, nextCalled } = run({ authorization: 'Bearer abc.def.ghi' });
  assert.equal(res.code, 401);
  assert.equal(nextCalled, false);
});

test('다른 키로 서명한 토큰은 401', () => {
  const forged = jwt.sign({ sub: 'user-1' }, 'another-secret');
  const { res, nextCalled } = run({ authorization: `Bearer ${forged}` });
  assert.equal(res.code, 401);
  assert.equal(nextCalled, false);
});

test('만료된 토큰은 401', () => {
  const expired = jwt.sign({ sub: 'user-1' }, 'test-secret', { expiresIn: -10 });
  const { res, nextCalled } = run({ authorization: `Bearer ${expired}` });
  assert.equal(res.code, 401);
  assert.equal(nextCalled, false);
});

test('유효한 토큰이면 next 를 호출하고 req.userId 에 토큰의 사용자 id 를 넣는다', () => {
  const token = signToken('user-1');
  const { req, res, nextCalled } = run({ authorization: `Bearer ${token}` });
  assert.equal(nextCalled, true);
  assert.equal(req.userId, 'user-1');
  assert.equal(res.code, null);
});

test('요청에 uid 를 실어 보내도 사용자는 토큰으로만 정해진다', () => {
  const token = signToken('user-1');
  const { req } = run({ authorization: `Bearer ${token}` });
  req.query = { uid: 'someone-else' };
  assert.equal(req.userId, 'user-1');
});

test('서버에 JWT_SECRET 이 없으면 500 (토큰 문제와 구분한다)', () => {
  const token = signToken('user-1');
  const saved = process.env.JWT_SECRET;
  const originalError = console.error;
  delete process.env.JWT_SECRET;
  console.error = () => {}; // 이 상황에서 서버가 남기는 에러 로그는 테스트 출력에서 숨긴다
  try {
    const { res, nextCalled } = run({ authorization: `Bearer ${token}` });
    assert.equal(res.code, 500);
    assert.equal(nextCalled, false);
  } finally {
    console.error = originalError;
    process.env.JWT_SECRET = saved;
  }
});
