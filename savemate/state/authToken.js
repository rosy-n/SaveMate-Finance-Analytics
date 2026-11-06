// state/authToken.js
// 로그인 토큰을 React 밖(useApi 의 fetch)에서도 쓸 수 있도록 모듈 단위로 보관한다.
// AuthContext 가 로그인/복원/로그아웃 시 setAuthToken 으로 갱신한다.

let currentToken = null;
let unauthorizedHandler = null;

export const getAuthToken = () => currentToken;

export const setAuthToken = (token) => {
  currentToken = token || null;
};

// 토큰을 보낸 요청이 401 을 받으면(만료/무효) 호출된다. AuthContext 가 자동 로그아웃으로 연결한다.
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export const notifyUnauthorized = () => {
  if (unauthorizedHandler) unauthorizedHandler();
};
