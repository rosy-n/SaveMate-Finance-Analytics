# SaveMate 앱

SaveMate의 모바일 앱(Expo / React Native)입니다. 프로젝트 소개는 [루트 README](../README.md)를, API 서버는 [서버 README](server/README.md)를 참고하세요.

## 사전 준비

- Node.js 18 이상
- 실행 중인 SaveMate API 서버 (먼저 [서버 README](server/README.md)의 "빠른 시작"을 완료하세요)
- 폰에서 실행한다면 [Expo Go](https://expo.dev/go) 앱. 폰과 개발 PC는 **같은 Wi-Fi**에 있어야 합니다.

## 빠른 시작

```bash
# 1. 패키지 설치
npm install

# 2. 환경 변수 파일 만들기 (아래 표 참고. 필요한 값만 넣으면 됩니다)
#    savemate/.env

# 3. 앱 실행
npx expo start
```

실행하면 터미널에 에뮬레이터, 시뮬레이터, Expo Go로 여는 방법이 표시됩니다.

| 명령 | 설명 |
|---|---|
| `npm start` | 개발 서버 실행 |
| `npm run android` / `npm run ios` / `npm run web` | 해당 플랫폼으로 실행 |
| `npm run lint` | 앱 폴더 린트 검사 (`expo lint`) |
| `npm run lint:all` | 서버 파일까지 포함한 프로젝트 전체 린트 검사. CI 가 이 명령을 씁니다 |
| `npm test` | 금액 입력 계산기(`constants/calculate.js`) 테스트 |

## 환경 변수 (`savemate/.env`)

`EXPO_PUBLIC_` 으로 시작하는 값은 앱에 포함됩니다. **비밀 값을 넣지 마세요.** 값을 바꾼 뒤에는 개발 서버를 다시 시작해야 합니다.

| 이름 | 설명 |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | API 서버 전체 주소 (예: `http://192.168.0.10:8080`). 가장 우선합니다 |
| `EXPO_PUBLIC_API_HOST` | 서버 호스트만 지정할 때 사용 |
| `EXPO_PUBLIC_API_PORT` | 서버 포트 (기본 8080) |
| `EXPO_PUBLIC_FAKE_TODAY` | `YYYY-MM-DD`를 넣으면 앱의 "오늘"을 그 날짜로 고정합니다. 더미데이터 기간에 맞춰 시연할 때 사용하고, 비우면 실제 오늘을 씁니다 |
| `EXPO_PUBLIC_UID` | 선택 사항입니다. 보통은 설정하지 않아도 됩니다 |

### 서버 주소를 정하는 순서

1. `EXPO_PUBLIC_API_BASE_URL`
2. `app.config.js`의 `extra.API_BASE_URL`
3. 자동 추정: `EXPO_PUBLIC_API_HOST` → 개발 PC의 IP(Expo가 알려주는 값) → 안드로이드 에뮬레이터는 `10.0.2.2`, 그 외는 `localhost`

## 로그인

회원가입 후 로그인해야 사용할 수 있습니다. 로그인하면 받은 토큰이 모든 API 요청의 `Authorization: Bearer` 헤더에 자동으로 붙습니다.

- "로그인 상태 유지"를 선택하면 앱을 다시 켜도 자동으로 로그인됩니다.
- 토큰이 만료되면 서버가 401을 응답하고, 앱은 자동으로 로그아웃해 로그인 화면으로 돌아갑니다.

## 폴더 구조

```
savemate/
├── app/            # 화면. 폴더/파일 이름이 곧 경로입니다 (expo-router)
│   ├── (tabs)/     #   홈, 리포트, 챌린지, 마이페이지 탭
│   ├── login.jsx, signup.jsx
│   └── _layout.tsx #   최상위 레이아웃 (로그인 상태 공급)
├── components/     # 화면을 구성하는 UI 컴포넌트
├── hooks/          # API 호출(useApi), 오늘의 팁 등 커스텀 훅
├── state/          # 로그인 상태(AuthContext), 토큰 보관(authToken)
├── constants/      # API 주소, 앱 기준 날짜, 아이콘, 계산기 수식 계산(calculate.js) 등
├── __tests__/      # 앱 로직 테스트 (Node 내장 test runner)
└── server/         # API 서버 (서버 테스트는 server/test/)
```

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| "네트워크 연결 실패" | 앱이 서버에 닿지 못함 | 서버가 실행 중인지, 폰과 PC가 같은 Wi-Fi인지 확인하세요. 실기기에서는 `localhost`가 폰 자신을 가리키므로 `EXPO_PUBLIC_API_BASE_URL`에 PC의 IP를 넣으세요 |
| 갑자기 로그인 화면으로 돌아감 | 토큰 만료 또는 서버의 `JWT_SECRET` 변경 | 다시 로그인하세요 |
| `.env`를 바꿨는데 반영이 안 됨 | 환경 변수는 시작할 때만 읽음 | `npx expo start -c`로 캐시를 지우고 다시 시작하세요 |
| 리포트가 비어 있고 "지출 내역이 없어요"가 나옴 | 선택한 달에 지출이 없음 | 지출을 기록하거나, 더미데이터 기간(2026-07 ~ 2026-11)의 달을 선택하세요 |

## 더 알아보기

- [Expo 문서](https://docs.expo.dev/)
- [expo-router(파일 기반 라우팅)](https://docs.expo.dev/router/introduction)
