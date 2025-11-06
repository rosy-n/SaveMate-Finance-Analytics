# SaveMate Server - Firebase Setup Guide

SaveMate 서버를 로컬 환경에서 실행하기 위한 Firebase Admin SDK 연동 가이드입니다.

---

## 📋 사전 준비

- Node.js 18 이상
- Firebase 프로젝트 접근 권한
- Git 설치

---

## 🚀 빠른 시작
```bash
# 1. 패키지 설치
npm install

# 2. 환경 변수 파일 생성
cp .env.example .env

# 3. .env 파일 수정 (아래 단계 참고)
# PORT와 FIREBASE_SERVICE_ACCOUNT_BASE64 값 입력

# 4. 서버 실행
npm run dev

# 5. 브라우저에서 확인
# http://localhost:8080/health → "OK" 출력 확인
```

---

## 🔧 상세 설정 가이드

### 1. Firebase 서비스 계정 키 생성

1. [Firebase Console](https://console.firebase.google.com) 접속
2. SaveMate 프로젝트 선택
3. 상단 톱니바퀴(⚙️) → **프로젝트 설정** 선택
4. **서비스 계정** 탭으로 이동
5. **새 비공개 키 생성** 클릭
6. `service-account.json` 파일 다운로드

> ⚠️ **보안 주의**: 이 파일은 Firebase 관리자 권한을 포함합니다. 절대 GitHub나 외부에 공유하지 마세요.

### 2. Base64 인코딩

다운로드한 `service-account.json` 파일을 Base64 문자열로 변환합니다.

**macOS / Linux**
```bash
base64 -i service-account.json | tr -d '\n' | pbcopy
```

**Windows PowerShell**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\경로\service-account.json")) | Set-Clipboard
```

### 3. 환경 변수 설정

`server/.env` 파일을 열어 다음과 같이 설정합니다:
```env
PORT=8080
FIREBASE_SERVICE_ACCOUNT_BASE64=복사한_Base64_문자열_한_줄로_붙여넣기
```

**주의사항**
- `=` 뒤에 공백을 넣지 않습니다
- Base64 문자열은 반드시 한 줄로 입력해야 합니다
- 파일 인코딩은 UTF-8 (BOM 없음)으로 저장해야 합니다

### 4. 서버 실행
```bash
npm run dev
```

**정상 실행 시 출력 예시**
```
[OK] service-account.json 생성 완료
[nodemon] starting `node index.js`
API listening on http://localhost:8080
```

브라우저에서 `http://localhost:8080/health` 접속 → `OK` 출력 확인

---

## 📁 프로젝트 구조
```
server/
├── .env                          # 환경 변수 (gitignore)
├── .env.example                  # 환경 변수 템플릿
├── service-account.json          # Firebase 키 (자동 생성, gitignore)
├── firebaseAdmin.js              # Firebase Admin 초기화
├── index.js                      # 서버 진입점
├── package.json
└── ../scripts/make-service-account.js
```

---

## 🐛 문제 해결

| 오류 메시지 | 원인 | 해결 방법 |
|------------|------|-----------|
| `FIREBASE_SERVICE_ACCOUNT_BASE64가 .env에 없습니다` | `.env` 파일 누락 또는 값 비어있음 | `.env` 파일이 `server/` 폴더에 존재하고 Base64 값이 입력되어 있는지 확인 |
| `Base64가 올바른 JSON이 아닙니다` | Base64 값 손상 | `service-account.json`을 다시 인코딩 후 복사 |
| `nodemon: command not found` | nodemon 미설치 | `npm i -D nodemon` 실행 |
| `Cannot find module 'express'` | 패키지 미설치 | `npm install` 실행 |
| `PORT already in use` | 포트 충돌 | `.env`의 `PORT` 값을 다른 숫자(예: 8081)로 변경 |

---

## 🔒 보안 규칙

`.gitignore`에 반드시 포함되어야 할 항목:
```gitignore
node_modules
.env
service-account.json
```

- `.env` 및 `service-account.json` 파일은 절대 GitHub에 커밋하지 않습니다
- Base64 문자열만 안전하게 팀원과 공유하세요

---

## 📝 라이선스

이 프로젝트는 학습 및 내부 협업 목적으로 제작되었습니다.  
Firebase 서비스 키 및 민감 데이터의 무단 배포는 금지됩니다.

---

## 💬 문의

프로젝트 관련 문의사항은 이슈를 통해 남겨주세요.
