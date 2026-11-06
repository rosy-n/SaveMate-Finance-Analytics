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
| `JWT_SECRET` | 로그인 토큰(JWT) 서명 키. **필수**이며 없으면 로그인과 모든 보호된 API가 동작하지 않음. 임의의 긴 문자열 (예: `openssl rand -hex 48`) |
| `LOGIN_MAX_FAILURES` | (선택) 같은 IP에서 15분 동안 허용하는 로그인 실패 횟수. 기본 10 |
| `SIGNUP_MAX_PER_HOUR` | (선택) 같은 IP에서 1시간 동안 허용하는 회원가입 요청 횟수. 기본 10 |
| `TRUST_PROXY` | (선택) 서버가 프록시(Render, Nginx 등) 뒤에 있을 때만 설정. 프록시 단계 수 (예: `1`). 설정하지 않으면 프록시 IP 하나로 보여 모든 사용자가 제한을 함께 씀 |
| `LLM_REPORTS_PER_HOUR` | (선택) 사용자당 시간당 AI 리포트 새로 생성 횟수 한도. 기본 10 |
| `LLM_TIMEOUT_MS` | (선택) Gemini 요청 1건의 제한 시간(ms). 기본 15000 |

> ⚠️ `.env` 는 비밀번호/키가 들어 있으므로 절대 커밋하지 않습니다. (`.gitignore` 에 등록됨)

---

## 🧪 테스트

```bash
npm test
```

Node 내장 test runner(`node --test`)를 쓰므로 별도 패키지 설치가 필요 없고, DB나 Gemini 키 없이 실행됩니다. 테스트 파일은 `test/` 에 있습니다.

| 파일 | 검증하는 것 |
|---|---|
| `financeAnalytics.test.js` | 리포트 수치 계산 (상관계수, 카테고리 만족 효율, 이상치, 되돌아볼 소비) |
| `requireAuth.test.js` | 토큰 검증 (없음/잘못됨/만료/위조 → 401, 유효하면 `req.userId` 설정) |
| `rateLimit.test.js` | 로그인 실패 횟수 제한, 회원가입 횟수 제한 |
| `llmGuard.test.js` | Gemini 생성 한도와 실패 쿨다운 |

새 기능을 추가하면 같은 방식으로 `test/*.test.js` 를 추가하세요. GitHub 에 올리면 CI 가 같은 테스트를 자동으로 실행합니다.

---

## 🗄️ 데이터베이스

팀원 모두 같은 Neon DB 를 사용하고, 데이터는 `user_id` 로 사용자별로 구분됩니다.

| 테이블 | 설명 |
|---|---|
| `users` | 사용자 (아이디, 닉네임, 이메일, 비밀번호 해시) |
| `categories` | 소비/수입 카테고리 (고정 목록) |
| `transactions` | 수입/지출 거래 |
| `satisfaction_ratings`, `satisfaction_reasons` | 지출 만족도 평가와 사유 |
| `challenges` | 카테고리별 소비 목표 챌린지 |
| `feedback` | 마이페이지에서 보낸 오류 신고/의견 |
| `alarm_settings` | 사용자별 만족도 알림 설정 |
| `report_cache`, `tip_cache` | Gemini 가 만든 월간 리포트 / 오늘의 절약팁 캐시 |

스키마는 `db/migrations/*.sql` 로 관리합니다.

- 스키마를 바꿀 때는 **기존 파일을 수정하지 말고** `002_xxx.sql` 처럼 새 파일을 추가하세요.
- `npm run migrate` 는 아직 적용하지 않은 파일만 순서대로 실행하고, 이력을 `schema_migrations` 에 기록합니다.

### 코드 구조

```
server/
├── index.js              # 서버 진입점
├── routes/               # API 라우트 (auth, transactions, satisfaction, challenges, reports, tips, feedback, alarmSettings)
├── analytics/            # 리포트 수치 계산 (financeAnalytics.js)
├── db/
│   ├── pool.js           # PostgreSQL 연결 풀
│   ├── migrate.js        # 마이그레이션 실행기
│   ├── migrations/       # 스키마 SQL
│   ├── seed.js, seeds/   # 페르소나 더미데이터
│   ├── users.js          # 사용자 조회/생성
│   ├── transactions.js   # 거래 조회/저장
│   ├── satisfaction.js   # 만족도 평가
│   ├── challenges.js     # 챌린지
│   └── cache.js          # LLM 결과 캐시
├── lib/
│   ├── auth.js           # 비밀번호 해시, JWT 발급/검증
│   ├── requireAuth.js    # 인증 미들웨어 (req.userId 설정)
│   ├── llmGuard.js       # Gemini 호출 제한 시간 / 생성 한도 / 실패 쿨다운
│   ├── dates.js          # 날짜(KST)
│   └── http.js           # 공통 에러 응답 헬퍼
└── neon.ts               # Neon 프로젝트 설정
```

---

## 🔐 인증

회원가입/로그인으로 받은 JWT를 `Authorization: Bearer <token>` 헤더로 보내야 합니다.

- 인증 없이 호출할 수 있는 경로는 `/api/health`, `/api/auth/signup`, `/api/auth/login` 뿐입니다. (`/api/auth/me` 는 토큰을 직접 확인합니다)
- 나머지 모든 `/api/*` 는 `lib/requireAuth.js` 를 거치며, 토큰이 없거나 만료되면 **401** 을 응답합니다.
- 로그인/회원가입에는 IP 단위 횟수 제한이 있습니다 (`lib/rateLimit.js`). 로그인은 실패한 시도만 세고(성공은 제외), 한도를 넘으면 **429** 와 안내 문구를 응답합니다. 상태는 서버 메모리에 있어 재시작하면 초기화됩니다.
- 사용자는 토큰에서 꺼낸 `req.userId` 로만 식별합니다. 요청에 `uid` 를 실어 보내지 않으며, 보내도 무시됩니다. **새 라우트에서도 `req.userId` 만 사용하세요.**

## 🧭 API 목록

| 경로 | 설명 |
|---|---|
| `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me` | 회원가입, 로그인, 토큰으로 내 정보 확인 |
| `POST /api/transactions` | 거래 기록 |
| `GET /api/transactions?year=&month=` | 월별 거래 |
| `GET /api/transactions/unrated`, `/monthly-sum`, `/all` | 미평가 지출, 월별 지출 추이, 전체 거래 |
| `POST /api/transactions/bulk`, `DELETE /api/transactions/:tid` | id 목록으로 조회, 거래 삭제 |
| `POST /api/satisfaction`, `GET /api/satisfaction` | 만족도 평가 저장, 내 평가 전체 조회 |
| `GET /api/reports/consumption?year=&month=` | 월간 AI 리포트 |
| `GET /api/tips/today` | 오늘의 절약팁 |
| `GET /api/challenges/categories`, `/recommendation`, `/history` | 챌린지 카테고리, 추천, 지난 챌린지 |
| `GET /api/challenges`, `POST /api/challenges` | 진행 중 챌린지 목록, 챌린지 생성 |
| `GET /api/challenges/:id`, `POST /api/challenges/:id/giveup` | 챌린지 상세, 포기 |
| `POST /api/feedback` | 오류 신고/의견 보내기 |
| `GET /api/alarm-settings`, `PUT /api/alarm-settings` | 만족도 알림 설정 조회/저장 |

## 🤖 Gemini 호출 제한

리포트와 절약팁은 DB에 캐시되며, 캐시가 있으면 Gemini를 호출하지 않습니다. 거래/만족도가 바뀌어 캐시가 지워진 뒤 **새로 생성할 때만** 아래 제한이 적용됩니다.

- Gemini 요청 1건은 `LLM_TIMEOUT_MS`(기본 15초)를 넘기면 중단됩니다.
- 리포트는 사용자당 시간당 `LLM_REPORTS_PER_HOUR`(기본 10)회까지 새로 생성합니다. 초과하면 안내 문구를 응답합니다.
- 생성에 실패하면 1분 동안 같은 안내를 응답하고 다시 호출하지 않습니다. (실패 결과는 캐시하지 않습니다)
- 이 상태는 서버 메모리에만 있어 서버를 재시작하면 초기화됩니다.

---

## 🐛 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `DATABASE_URL이 .env에 없습니다` | `.env` 누락 | `.env.example` 을 복사해 값 입력 |
| `password authentication failed` | 연결 문자열의 비밀번호 오류 | Neon 콘솔 Connect 에서 다시 복사 |
| `Cannot find module 'pg'` 등 | 패키지 미설치 | `npm install` |
| `PORT already in use` | 포트 충돌 | `.env` 의 `PORT` 를 다른 값으로 |
| 리포트/팁이 기본 문구만 나옴 | Gemini 키 오류 또는 무료 한도(429) 초과 | 키 확인, 잠시 후 재시도 또는 `GEMINI_MODEL` 변경 |
| 리포트에 "너무 많이 요청했어요"가 나옴 | 시간당 생성 한도 초과 | 잠시 후 다시 시도하거나 `LLM_REPORTS_PER_HOUR` 조정 |
| 로그인/회원가입이 429 ("시도가 너무 많아요") | 같은 IP에서 한도 초과 (같은 Wi-Fi 사용자는 한도를 함께 씀) | 15분(회원가입은 1시간) 기다리거나 `LOGIN_MAX_FAILURES`, `SIGNUP_MAX_PER_HOUR` 조정 |
| 모든 API가 401 | 토큰 없음/만료, 또는 서버의 `JWT_SECRET` 이 바뀜 | 앱에서 다시 로그인 |
| 로그인/보호된 API가 500 (`server misconfigured`) | `.env` 에 `JWT_SECRET` 누락 | `JWT_SECRET` 추가 후 서버 재시작 |

---

## 🔒 보안 규칙

- `.env` 는 커밋하지 않습니다. 연결 문자열/키는 공개 채널이 아니라 개인 메시지로 공유합니다.
- DB 비밀번호가 노출되면 Neon 콘솔에서 비밀번호를 재설정하세요.
- `JWT_SECRET` 이 노출되면 누구나 로그인 토큰을 위조할 수 있습니다. 노출되면 새 값으로 바꾸세요. (바꾸면 모든 사용자가 다시 로그인해야 합니다)

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
