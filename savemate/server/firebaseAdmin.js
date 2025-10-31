// firebaseAdmin.js
require('dotenv').config();
const admin = require('firebase-admin');

function init() {
  if (admin.apps.length) return;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  try {
    if (b64 && b64.trim().length > 0) {
      const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      admin.initializeApp({ credential: admin.credential.cert(json) });
      console.log('✅ Firebase Admin: using BASE64 credentials');
    } else {
      // 로컬 개발용 파일 fallback (루트 기준)
      const sa = require('./service-account.json');
      admin.initializeApp({ credential: admin.credential.cert(sa) });
      console.log('✅ Firebase Admin: using ./service-account.json');
    }
  } catch (e) {
    console.error('❌ Firebase Admin init failed:', e.message);
    throw e;
  }
}

init();

const db = admin.firestore();
module.exports = { admin, db };
