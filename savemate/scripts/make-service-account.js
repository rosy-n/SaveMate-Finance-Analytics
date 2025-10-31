// scripts/make-service-account.js
const fs = require('fs');
const path = require('path');

// .env에서 FIREBASE_SERVICE_ACCOUNT_BASE64 가져오기
const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

// 결과로 저장할 경로 (server/service-account.json)
const outPath = path.join(process.cwd(), 'service-account.json');

// 환경변수 누락 시 에러 처리
if (!b64 || b64.trim() === '') {
  console.error(
    '[ERROR] FIREBASE_SERVICE_ACCOUNT_BASE64가 .env에 없습니다.\n' +
    '👉 .env.example을 복사해 .env를 만든 뒤 값을 채워주세요.'
  );
  process.exit(1);
}

try {
  // Base64 → UTF-8 문자열 → JSON 변환
  const jsonStr = Buffer.from(b64, 'base64').toString('utf8');

  // JSON 유효성 검사
  JSON.parse(jsonStr);

  // server 폴더에 service-account.json 생성 (덮어쓰기)
  fs.writeFileSync(outPath, jsonStr, { encoding: 'utf8' });

  console.log(`[OK] service-account.json 생성 완료 ✅: ${outPath}`);
} catch (e) {
  console.error('[ERROR] Base64가 올바른 JSON이 아닙니다 ❌:', e.message);
  process.exit(1);
}
