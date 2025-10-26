// server.js
import express from 'express';
import cors from 'cors';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 만약 serviceAccount 키(JSON)를 쓴다면 아래처럼:
// import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

initializeApp({
  // 방법1: 로컬 서비스 계정 키
  // credential: cert(serviceAccount)

  // 방법2: GCP 환경이라면 applicationDefault()
  credential: applicationDefault()
});

const db = getFirestore();

const app = express();
app.use(cors());
app.use(express.json());

// 거래 저장
app.post('/api/transactions', async (req, res) => {
  try {
    const { userId, amount, type, category, memo, date } = req.body;

    // (간단한 유효성 검사)
    if (!userId || !amount || !type || !date) {
      return res.status(400).send('필수 필드(userId, amount, type, date)가 없습니다.');
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).send('type은 income 또는 expense 여야 합니다.');
    }

    const docRef = await db.collection('transactions').add({
      userId,
      amount,
      type,
      category: category ?? '기타',
      memo: memo ?? '',
      date, // 'YYYY-MM-DD'
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      isSuccessed: true,
      transactionId: docRef.id
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('서버 내부 오류');
  }
});

app.listen(3000, () => {
  console.log('API 서버가 3000번 포트에서 실행 중입니다');
});
