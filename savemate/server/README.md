# SaveMate Server

SaveMate 앱의 API 서버입니다. Express + PostgreSQL(Neon) + Google Gemini 로 구성됩니다.

```
앱(Expo)  ──HTTP──▶  Express 서버  ──SQL──▶  PostgreSQL (Neon, 팀 공용)
                         └──────────────▶  Google Gemini (리포트/절약팁 생성)
```

앱은 DB 에 직접 접속하지 않고 서버의 API 만 호출합니다. DB 접속 정보는 서버의 `.env` 에만 둡니다.

---

## 📋 사전 준비

- Node.js 18 이상
- 팀 공용 Neon DB 연결 문자열 (팀에서 개인 메시지로 전달받기)
- Gemini API 키 (각자 [Google AI Studio](https://aistudio.google.com/apikey) 에서 발급)

---

## 🚀 빠른 시작

```bash
# 1. 패키지 설치
npm install

# 2. 환경 변수 파일 생성
cp .env.example .env        # Windows PowerShell: copy .env.example .env

# 3. .env 값 채우기 (아래 표 참고)

# 4. DB 스키마 적용 (이미 적용된 DB 라면 "up to date" 로 끝남)
npm run migrate

# 5. 서버 실행
npm run dev

# 6. 확인
# http://localhost:8080/api/health → {"status":"ok", ...}
```

### 환경 변수

| 이름 | 설명 |
|---|---|
| `PORT` | 서버 포트 (기본 8080) |
| `DATABASE_URL` | Neon 연결 문자열 (풀러 경유). 서버가 사용 |
| `DATABASE_URL_UNPOOLED` | Neon 직접 연결 문자열. `npm run migrate` 가 사용 |
| `GEMINI_API_KEY` | Gemini API 키 |
| `GEMINI_MODEL` | 기본 모델 (예: `gemini-3.5-flash-lite`). 실패하면 코드의 폴백 모델로 넘어감 |

> ⚠️ `.env` 는 비밀번호/키가 들어 있으므로 절대 커밋하지 않습니다. (`.gitignore` 에 등록됨)

---

## 🗄️ 데이터베이스

팀원 모두 같은 Neon DB 를 사용하고, 데이터는 `user_id` 로 사용자별로 구분됩니다.

| 테이블 | 설명 |
|---|---|
| `users` | 사용자 (아이디, 닉네임, 이메일, 비밀번호 해시) |
| `categories` | 소비/수입 카테고리 (고정 목록) |
| `transactions` | 수입/지출 거래 |
| `satisfaction_ratings`, `satisfaction_reasons` | 지출 만족도 평가와 사유 |
| `challenges` | 챌린지 (테이블만 있음, API 는 구현 예정) |
| `report_cache`, `tip_cache` | Gemini 가 만든 월간 리포트 / 오늘의 절약팁 캐시 |

스키마는 `db/migrations/*.sql` 로 관리합니다.

- 스키마를 바꿀 때는 **기존 파일을 수정하지 말고** `002_xxx.sql` 처럼 새 파일을 추가하세요.
- `npm run migrate` 는 아직 적용하지 않은 파일만 순서대로 실행하고, 이력을 `schema_migrations` 에 기록합니다.

### 코드 구조

```
server/
├── index.js              # 서버 진입점
├── routes/               # API 라우트 (transactions, satisfaction, reports, tips)
├── db/
│   ├── pool.js           # PostgreSQL 연결 풀
│   ├── migrate.js        # 마이그레이션 실행기
│   ├── migrations/       # 스키마 SQL
│   ├── users.js          # uid -> 사용자 id 변환
│   ├── transactions.js   # 거래 조회/저장
│   ├── satisfaction.js   # 만족도 평가
│   └── cache.js          # LLM 결과 캐시
├── lib/                  # 날짜(KST) / 공통 응답 헬퍼
└── neon.ts               # Neon 프로젝트 설정
```

### 사용자 식별 (로그인 연동 시 참고)

라우트는 현재 요청의 `uid` 를 `users` 테이블에서 찾아 사용합니다 (`lib/http.js` 의 `userOr404`).
기존 데이터는 `users.legacy_uid` 로 연결된 임시 계정입니다.
로그인 기능이 붙으면 `uid` 파라미터 대신 인증된 사용자(`req.user.id`)를 쓰도록 `userOr404` 부분만 교체하면 됩니다.

---

## 🐛 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `DATABASE_URL이 .env에 없습니다` | `.env` 누락 | `.env.example` 을 복사해 값 입력 |
| `password authentication failed` | 연결 문자열의 비밀번호 오류 | Neon 콘솔 Connect 에서 다시 복사 |
| `Cannot find module 'pg'` 등 | 패키지 미설치 | `npm install` |
| `PORT already in use` | 포트 충돌 | `.env` 의 `PORT` 를 다른 값으로 |
| 리포트/팁이 기본 문구만 나옴 | Gemini 키 오류 또는 무료 한도(429) 초과 | 키 확인, 잠시 후 재시도 또는 `GEMINI_MODEL` 변경 |

---

## 🔒 보안 규칙

- `.env` 는 커밋하지 않습니다. 연결 문자열/키는 공개 채널이 아니라 개인 메시지로 공유합니다.
- DB 비밀번호가 노출되면 Neon 콘솔에서 비밀번호를 재설정하세요.

---

## 🧪 페르소나 더미데이터

개인화 리포트 차이를 확인하기 위한 20대 여성 페르소나 4명의 데이터입니다. (2026-07-01 ~ 2026-11-06)

계정 정보와 페르소나 설명은 팀 노션을 확인하세요.

```bash
npm run seed:generate   # 생성기(db/seeds/generatePersonas.js)로 JSON 다시 만들기
npm run seed            # 데이터 전체 다시 넣기 (계정 id 유지, 페르소나 데이터만 교체)
npm run seed:accounts   # 계정 정보만 갱신 (거래/챌린지 유지)
npm run seed -- --month=2026-07   # 그 달의 거래/만족도만 교체 (다른 달은 유지)
```

- 시드는 `legacy_uid` 가 `persona_` 로 시작하는 계정만 건드리고, 실패하면 전체 롤백합니다.
- 비밀번호는 bcrypt 해시로 저장하고, 저장소에는 올리지 않습니다. 바꾸려면 `db/seeds/passwords.local.json` 에 `{ "persona_xxx": "비밀번호" }` 를 만들어 실행하세요. 이 파일이 없으면 기존 비밀번호가 유지됩니다.
- 로그인 방식이 확정되면 `db/seeds/personas/*.json` 의 `account` 를 고치고(해시 방식이 다르면 `db/seed.js` 도 함께) `npm run seed:accounts` 를 실행하세요.
