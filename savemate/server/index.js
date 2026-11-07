// server/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const transactionRoutes = require('./routes/transactions');
const satisfactionRoutes = require('./routes/satisfaction');
const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');
const alarmSettingsRoutes = require('./routes/alarmSettings');
const reportRoutes = require('./routes/reports');
const tipsRouter = require('./routes/tips');
const challengeRoutes = require('./routes/challenges');
const { requireAuth } = require('./lib/requireAuth');
const { loginLimiter, signupLimiter } = require('./lib/rateLimit');

const app = express();

// 프록시(Render, Nginx 등) 뒤에서 실행할 때만 설정한다. 설정하지 않으면 프록시 IP 하나로 보여 모든 사용자가 한도를 같이 쓴다.
// 예: TRUST_PROXY=1 (프록시 1단계)
if (process.env.TRUST_PROXY) {
  const v = process.env.TRUST_PROXY;
  app.set('trust proxy', /^\d+$/.test(v) ? Number(v) : v === 'true' ? true : v);
}

// CORS + JSON
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 304 방지: ETag 끄기 + 캐시 금지 헤더
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// 헬스체크 라우트(인라인, 확실하게 잡아주자)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// 인증 불필요: 회원가입/로그인 (/me 는 라우트 안에서 토큰을 직접 검증)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/signup', signupLimiter);
app.use('/api/auth', authRoutes);

// 이하 모든 라우트는 로그인(JWT) 필수. 사용자는 req.userId 로만 식별한다.
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/satisfaction', requireAuth, satisfactionRoutes);
app.use('/api/feedback', requireAuth, feedbackRoutes);
app.use('/api/alarm-settings', requireAuth, alarmSettingsRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/tips', requireAuth, tipsRouter);
app.use('/api/challenges', requireAuth, challengeRoutes);

// 존재하지 않는 경로
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'not found' });
});

// 처리되지 않은 에러(예: 잘못된 JSON 본문). 라우트는 fail() 로 직접 응답한다.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('[unhandled]', err);
  res.status(status).json({ ok: false, error: status === 500 ? 'internal server error' : err.message });
});

const port = Number(process.env.PORT || 8080);
// 외부(폰) 접근 가능하도록 0.0.0.0 바인딩
app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
  console.log(`Health check: http://0.0.0.0:${port}/api/health`);
});
