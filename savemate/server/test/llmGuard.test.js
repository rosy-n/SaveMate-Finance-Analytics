// lib/llmGuard.js 테스트: 시간당 생성 한도와 실패 쿨다운
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGenerationGuard } = require('../lib/llmGuard');

// 시간을 직접 움직일 수 있게 now 를 주입한다.
function setup(options) {
  const clock = { t: 0 };
  const guard = createGenerationGuard({ ...options, now: () => clock.t });
  return { guard, clock };
}

test('한도 안에서는 허용하고, 넘으면 limit 으로 막는다', () => {
  const { guard } = setup({ limit: 3, windowMs: 1000, cooldownMs: 500 });
  assert.equal(guard.check('u1').ok, true);
  assert.equal(guard.check('u1').ok, true);
  assert.equal(guard.check('u1').ok, true);
  assert.deepEqual(guard.check('u1'), { ok: false, reason: 'limit' });
});

test('사용자마다 한도를 따로 센다', () => {
  const { guard } = setup({ limit: 1, windowMs: 1000, cooldownMs: 500 });
  assert.equal(guard.check('u1').ok, true);
  assert.equal(guard.check('u1').ok, false);
  assert.equal(guard.check('u2').ok, true);
});

test('시간 창이 지나면 다시 허용한다', () => {
  const { guard, clock } = setup({ limit: 1, windowMs: 1000, cooldownMs: 500 });
  assert.equal(guard.check('u1').ok, true);
  assert.equal(guard.check('u1').ok, false);
  clock.t = 1000;
  assert.equal(guard.check('u1').ok, true);
});

test('실패하면 쿨다운 동안 cooldown 으로 막고, 지나면 허용한다', () => {
  const { guard, clock } = setup({ limit: 10, windowMs: 60000, cooldownMs: 500 });
  assert.equal(guard.check('u1').ok, true);
  guard.fail('u1');
  assert.deepEqual(guard.check('u1'), { ok: false, reason: 'cooldown' });
  clock.t = 499;
  assert.equal(guard.check('u1').ok, false);
  clock.t = 500;
  assert.equal(guard.check('u1').ok, true);
});

test('쿨다운은 실패한 사용자에게만 적용된다', () => {
  const { guard } = setup({ limit: 10, windowMs: 60000, cooldownMs: 500 });
  guard.fail('u1');
  assert.equal(guard.check('u2').ok, true);
});

test('성공하면 쿨다운이 풀린다', () => {
  const { guard } = setup({ limit: 10, windowMs: 60000, cooldownMs: 500 });
  guard.fail('u1');
  guard.success('u1');
  assert.equal(guard.check('u1').ok, true);
});

test('쿨다운 중에 막힌 요청은 생성 횟수로 세지 않는다', () => {
  const { guard, clock } = setup({ limit: 2, windowMs: 60000, cooldownMs: 500 });
  assert.equal(guard.check('u1').ok, true); // 1회
  guard.fail('u1');
  assert.equal(guard.check('u1').reason, 'cooldown'); // 세지 않음
  assert.equal(guard.check('u1').reason, 'cooldown'); // 세지 않음
  clock.t = 500;
  assert.equal(guard.check('u1').ok, true); // 2회
  assert.equal(guard.check('u1').reason, 'limit');
});

test('LLM_TIMEOUT_MS 환경변수가 없으면 기본 15초다', () => {
  const saved = process.env.LLM_TIMEOUT_MS;
  delete process.env.LLM_TIMEOUT_MS;
  delete require.cache[require.resolve('../lib/llmGuard')];
  try {
    assert.equal(require('../lib/llmGuard').LLM_TIMEOUT_MS, 15000);
  } finally {
    if (saved !== undefined) process.env.LLM_TIMEOUT_MS = saved;
    delete require.cache[require.resolve('../lib/llmGuard')];
  }
});
