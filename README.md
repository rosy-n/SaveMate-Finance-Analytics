# SaveMate

소비를 기록하고, 지출마다 **만족도**를 남기면 AI가 나의 소비 패턴을 분석해 주는 개인 재무 관리 앱입니다.
"얼마를 썼는지"에서 한 걸음 더 나아가 "그 소비에 만족했는지"를 함께 기록해, 후회하는 소비를 줄이도록 돕습니다.

## 주요 기능

| 탭 | 기능 |
|---|---|
| 홈 | 수입/지출 기록, 만족도를 아직 남기지 않은 지출 목록, 오늘의 절약팁, 진행 중인 챌린지 |
| 리포트 | 월간 AI 인사이트(소비 성향, 숨은 소비 패턴, 다음 행동 제안), 카테고리별 지출, 월별 지출 추이, 만족도 분석 |
| 챌린지 | 지난달 지출 기준 추천 챌린지, 카테고리별 목표 금액 설정, 진행 상황 확인, 포기, 지난 챌린지 |
| 마이페이지 | 만족도 알림 설정, 오류 신고/의견 보내기, FAQ |

## 구성

```
앱 (Expo / React Native)  ──HTTP + JWT──▶  Express 서버  ──SQL──▶  PostgreSQL (Neon)
                                                └─────────────────▶  Google Gemini (리포트 / 절약팁)
```

- 수치(합계, 비율, 패턴 판별)는 서버 코드가 계산하고, Gemini는 그 결과를 사람이 읽기 좋은 문장으로 설명합니다.
- 생성한 리포트와 절약팁은 DB에 캐시합니다. 새 거래나 만족도 기록이 생겨 데이터가 바뀌면 해당 월 리포트 캐시를 지우고 다시 생성합니다.
- 앱은 DB에 직접 접속하지 않고 서버 API만 호출합니다.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 앱 | Expo, React Native, expo-router(파일 기반 라우팅), react-native-chart-kit |
| 서버 | Node.js, Express 5 |
| DB | PostgreSQL ([Neon](https://neon.com)), SQL 마이그레이션 |
| AI | Google Gemini (`@google/generative-ai`) |
| 인증 | 아이디/비밀번호 로그인(bcrypt), JWT(Bearer) |

## 저장소 구조

```
.
├── README.md          # 지금 보고 있는 문서
└── savemate/
    ├── app/           # 화면 (expo-router)
    ├── components/    # UI 컴포넌트
    ├── hooks/         # API 호출 등 커스텀 훅
    ├── state/         # 로그인 상태(AuthContext)
    ├── constants/     # 공통 상수
    └── server/        # API 서버 (Express + Neon + Gemini)
```

## 실행 방법

서버를 먼저 실행한 뒤 앱을 실행합니다.

1. **서버**: [`savemate/server/README.md`](savemate/server/README.md) 의 "빠른 시작"을 따라 `.env`를 만들고 `npm run dev`로 실행합니다. (DB 연결 문자열, Gemini API 키, `JWT_SECRET` 필요)
2. **앱**: [`savemate/README.md`](savemate/README.md) 를 따라 의존성을 설치하고 `npx expo start`로 실행합니다.

## 로그인과 데이터

- 회원가입 후 로그인해야 앱을 사용할 수 있습니다. 서버는 토큰(JWT)에 담긴 사용자만 인식하며, 사용자는 자신의 데이터에만 접근할 수 있습니다.
- 개인화 리포트가 어떻게 달라지는지 확인할 수 있도록 20대 페르소나 4명의 더미데이터를 제공합니다. 넣는 방법은 서버 README의 "페르소나 더미데이터"를 참고하세요.

## 테스트와 CI

- 서버: `cd savemate/server && npm test` (리포트 수치 계산, 인증 미들웨어, rate limit, Gemini 호출 제한)
- 앱: `cd savemate && npm test` (금액 입력 계산기), `npm run lint:all` (서버까지 포함한 전체 린트)
- `main` 에 올리거나 PR 을 열면 GitHub Actions(`.github/workflows/ci.yml`)가 위 검사를 자동으로 실행합니다.

## 문서

- [앱 실행/환경 변수](savemate/README.md)
- [서버: 실행, 환경 변수, DB, API, 인증](savemate/server/README.md)
