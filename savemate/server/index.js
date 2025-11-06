// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const transactionRoutes = require('./routes/transactions'); // ← 기존 라우트

const app = express();

// CORS + JSON
app.use(cors());
app.use(express.json());

// 304 방지: ETag 끄기 + 캐시 금지 헤더
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// ✅ 헬스체크 라우트(인라인, 확실하게 잡아주자)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// 기존 라우트 마운트 (경로 정확히 /api/transactions)
app.use('/api/transactions', transactionRoutes);

const port = Number(process.env.PORT || 8080);
// 외부(폰) 접근 가능하도록 0.0.0.0 바인딩
app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
  console.log(`Health check: http://0.0.0.0:${port}/api/health`);
});
