// server/lib/rateLimit.js
// 로그인/회원가입 무차별 대입 방어. IP 단위로 횟수를 센다. (상태는 서버 메모리, 재시작하면 초기화)
//
//  - 로그인: 15분 동안 실패한 시도가 LOGIN_MAX_FAILURES(기본 10)회를 넘으면 차단.
//            성공한 로그인은 세지 않으므로 정상 사용자는 영향이 없다.
//  - 회원가입: 1시간에 SIGNUP_MAX_PER_HOUR(기본 10)회까지.
//
// 같은 공유기/학교 Wi-Fi 처럼 IP 를 함께 쓰는 사용자는 한도를 같이 쓴다.
// 서버가 프록시(Render, Nginx 등) 뒤에 있으면 index.js 의 TRUST_PROXY 설정이 필요하다.
const { rateLimit } = require('express-rate-limit');

const tooMany = (message) => (req, res) => {
  res.status(429).json({ ok: false, error: message });
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_MAX_FAILURES) || 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('로그인 시도가 너무 많아요. 15분 뒤에 다시 시도해 주세요.'),
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.SIGNUP_MAX_PER_HOUR) || 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('회원가입 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'),
});

module.exports = { loginLimiter, signupLimiter };
