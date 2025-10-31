// server/firebaseAdmin.js
require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let credential;
const jsonPath = path.join(__dirname, 'service-account.json');

if (fs.existsSync(jsonPath)) {
  const serviceAccount = require(jsonPath);
  credential = admin.credential.cert(serviceAccount);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  const jsonStr = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
  credential = admin.credential.cert(JSON.parse(jsonStr));
} else {
  throw new Error('Firebase Admin 자격 정보가 없습니다.');
}

admin.initializeApp({ credential });

module.exports = admin;
