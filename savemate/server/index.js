// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// 1) app 먼저 생성
const app = express();

// 2) 공통 미들웨어
app.use(cors());
app.use(express.json());

// 3) 라우트 로드
const healthRoutes = require('./routes/health');
const transactionRoutes = require('./routes/transactions');
const satisfactionRoutes = require('./routes/satisfaction'); // ✅ 새로 추가한 라우트

// 4) 라우트 등록
app.use('/api', healthRoutes);                         // GET /api/health
app.use('/api/transactions', transactionRoutes);       // POST /api/transactions
app.use('/api/satisfaction', satisfactionRoutes);      // POST /api/satisfaction

// 5) 서버 구동
const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
