// routes/tips.js 테스트: 오늘의 절약팁 캐시와 Gemini 장애 처리
// DB 와 Gemini 모듈만 가짜로 바꿔 끼우고 라우트는 실제 코드를 그대로 쓴다. (키나 DB 없이 실행된다)
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// 라우트가 불러오기 전에 가짜 모듈을 require 캐시에 넣는다.
function fakeModule(request, exports) {
  const filename = require.resolve(request);
  require.cache[filename] = { id: filename, filename, loaded: true, exports, children: [], paths: [] };
}

const state = {
  generateCalls: 0,
  setTipCalls: 0,
  cache: new Map(), // userId -> 저장된 팁
  generate: null, // 테스트마다 교체: Gemini 응답을 흉내 낸다
};

fakeModule('@google/generative-ai', {
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: async (...args) => {
          state.generateCalls++;
          return state.generate(...args);
        },
      };
    }
  },
});
fakeModule('../db/transactions', {
  listSince: async () => [{ amount: 5000, category: '카페', memo: '', type: 'expense', date: '2026-11-01' }],
});
fakeModule('../db/cache', {
  getTip: async (userId) => state.cache.get(userId) ?? null,
  setTip: async (userId, _key, content) => {
    state.setTipCalls++;
    state.cache.set(userId, content);
  },
});

const router = require('../routes/tips');

const GOOD_TIPS = { title: '오늘의 절약팁', tips: [{ content: '커피를 텀블러에 담아 가세요.', reason: '카페 지출이 많아요.' }] };
const succeed = async () => ({ response: { text: () => JSON.stringify(GOOD_TIPS) } });
const fail = async () => { throw new Error('Gemini 장애'); }; // 재시도 대상이 아닌 에러라서 바로 폴백으로 간다

async function request(userId) {
  const app = express();
  app.use((req, _res, next) => { req.userId = userId; next(); });
  app.use('/api/tips', router);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/tips/today`);
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

function reset() {
  state.generateCalls = 0;
  state.setTipCalls = 0;
  state.cache.clear();
  state.generate = succeed;
}

test('캐시에 오늘 팁이 있으면 Gemini 를 부르지 않는다', async () => {
  reset();
  state.cache.set('u-cached', GOOD_TIPS);
  const { status, body } = await request('u-cached');
  assert.equal(status, 200);
  assert.equal(body.meta.cached, true);
  assert.deepEqual(body.tip, GOOD_TIPS);
  assert.equal(state.generateCalls, 0);
});

test('캐시가 없으면 Gemini 로 생성하고 결과를 캐시에 저장한다', async () => {
  reset();
  const { body } = await request('u-fresh');
  assert.equal(body.meta.cached, false);
  assert.equal(body.meta.degraded, undefined);
  assert.equal(body.tip.tips[0].content, '커피를 텀블러에 담아 가세요.');
  assert.equal(state.generateCalls, 1);
  assert.equal(state.setTipCalls, 1);
  assert.deepEqual(state.cache.get('u-fresh'), body.tip);
});

test('Gemini 가 실패하면 폴백 팁을 돌려주되 캐시에는 저장하지 않는다 (하루 종일 고정 문구가 되지 않도록)', async () => {
  reset();
  state.generate = fail;
  const { status, body } = await request('u-fail');
  assert.equal(status, 200);
  assert.equal(body.meta.degraded, true);
  assert.ok(body.tip.tips.length > 0, '폴백 팁은 내용이 있어야 한다');
  assert.equal(state.setTipCalls, 0);
  assert.equal(state.cache.has('u-fail'), false);
});

test('실패 직후 다시 요청하면 쿨다운으로 Gemini 를 다시 부르지 않고 폴백을 돌려준다', async () => {
  reset();
  state.generate = fail;
  await request('u-cooldown');
  assert.equal(state.generateCalls, 1);

  const second = await request('u-cooldown');
  assert.equal(second.body.meta.degraded, true);
  assert.equal(state.generateCalls, 1, '쿨다운 중에는 Gemini 를 부르지 않는다');
  assert.equal(state.setTipCalls, 0);
});

test('쿨다운은 실패한 사용자에게만 적용된다', async () => {
  reset();
  state.generate = fail;
  await request('u-failed-user');

  state.generate = succeed;
  const other = await request('u-other-user');
  assert.equal(other.body.meta.degraded, undefined);
  assert.equal(other.body.tip.tips[0].content, '커피를 텀블러에 담아 가세요.');
  assert.equal(state.cache.has('u-other-user'), true);
});

test('Gemini 가 형식이 잘못된 응답을 주면 실패로 보고 캐시하지 않는다', async () => {
  reset();
  state.generate = async () => ({ response: { text: () => '죄송합니다, 만들 수 없어요.' } });
  const { body } = await request('u-bad-format');
  assert.equal(body.meta.degraded, true);
  assert.equal(state.setTipCalls, 0);
});
