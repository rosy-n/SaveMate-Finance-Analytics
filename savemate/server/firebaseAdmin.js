// server/firebaseAdmin.js
require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let credential;
const jsonPath = path.join(__dirname, 'service-account.json');

if (fs.existsSync(jsonPath)) {
  const sa = require(jsonPath);
  credential = admin.credential.cert(sa);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  const jsonStr = Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64'
  ).toString('utf8');
  const sa = JSON.parse(jsonStr);
  credential = admin.credential.cert(sa);
} else {
  throw new Error('Firebase Admin 자격 정보가 없습니다.');
}

if (!admin.apps.length) {
  admin.initializeApp({ credential });
}

const db = admin.firestore();

// 디버그(필요시 주석 해제)
// console.log('🔥 Firestore project ID:', admin.app().options.projectId);

module.exports = { admin, db };
