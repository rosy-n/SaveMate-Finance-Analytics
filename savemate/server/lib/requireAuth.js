// server/lib/requireAuth.js
// Authorization: Bearer <JWT> 를 검증하고 req.userId 에 로그인한 사용자 id(uuid)를 넣는다.
// 라우트는 클라이언트가 보낸 uid 가 아니라 반드시 req.userId 만 사용해야 한다.
const { verifyToken } = require('./auth');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: '로그인이 필요해요.' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('[requireAuth] JWT_SECRET이 .env에 없습니다.');
    return res.status(500).json({ ok: false, error: 'server misconfigured' });
  }

  try {
    req.userId = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: '로그인이 만료되었어요. 다시 로그인해 주세요.' });
  }
}

module.exports = { requireAuth };
