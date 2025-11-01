// server/firebaseAdmin.js
require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let credential;
const jsonPath = path.join(__dirname, 'service-account.json');

// 1) 파일이 있으면 파일로
if (fs.existsSync(jsonPath)) {
  const sa = require(jsonPath);
  credential = admin.credential.cert(sa);
// 2) 없으면 환경변수(Base64)로
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  const jsonStr = Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64'
  ).toString('utf8');
  const sa = JSON.parse(jsonStr);
  credential = admin.credential.cert(sa);
} else {
  throw new Error('Firebase Admin 자격 정보가 없습니다. service-account.json 또는 FIREBASE_SERVICE_ACCOUNT_BASE64를 설정하세요.');
}

if (!admin.apps.length) {
  admin.initializeApp({ credential });
}

const db = admin.firestore();

module.exports = { admin, db };
