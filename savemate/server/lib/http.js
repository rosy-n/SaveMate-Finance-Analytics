// server/lib/http.js
// 라우트 공통 헬퍼
const { resolveUserId } = require('../db/users');

/**
 * uid 를 사용자 id 로 변환한다. 없으면 404 를 응답하고 null 을 반환한다.
 * (로그인 기능이 붙으면 이 함수 대신 인증된 사용자(req.user.id)를 사용하면 된다.)
 */
async function userOr404(res, uid) {
  const id = await resolveUserId(uid);
  if (!id) {
    res.status(404).json({ ok: false, error: 'user not found' });
    return null;
  }
  return id;
}

// 잘못된 입력값 때문에 DB 제약에 걸린 경우는 400, 그 외는 500
const PG_CLIENT_ERRORS = {
  '23514': 'invalid value (check constraint)',
  '22P02': 'invalid input value',
  '23503': 'referenced row does not exist',
  '23502': 'required value is missing',
  '22007': 'invalid date',
  '22008': 'invalid date',
};

function fail(res, tag, e) {
  if (e && e.status && e.status < 500) {
    return res.status(e.status).json({ ok: false, error: e.message });
  }
  if (e && PG_CLIENT_ERRORS[e.code]) {
    return res.status(400).json({ ok: false, error: PG_CLIENT_ERRORS[e.code] });
  }
  console.error(tag, e);
  return res.status(500).json({ ok: false, error: e.message });
}

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

module.exports = { userOr404, fail, badRequest };
