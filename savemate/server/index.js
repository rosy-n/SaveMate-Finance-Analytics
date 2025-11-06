// server/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const healthRoutes = require('./routes/health');           // 이미 있다면 유지
const transactionRoutes = require('./routes/transactions');
const satisfactionRoutes = require('./routes/satisfaction');

const app = express();

/** 기본 미들웨어 */
app.use(cors());                 // 모바일(Expo) 접근 허용
app.use(express.json());         // JSON Body 파싱
app.use(morgan('dev'));          // 요청 로깅

/** 라우트 */
app.use('/api/health', healthRoutes);                  // GET /api/health
app.use('/api/transactions', transactionRoutes);       // POST/GET /api/transactions
app.use('/api/satisfaction', satisfactionRoutes); // POST /api/satisfaction

/** 404 (API 경로) */
app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'Not Found' });
});

/** 에러 핸들러 */
app.use((err, _req, res, _next) => {
  console.error('[Express Error]', err);
  res.status(500).json({ ok: false, error: err.message || 'Server error' });
});

/** 서버 시작: 폰에서 접속 가능하도록 0.0.0.0 바인딩 */
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/api/health`);
});
