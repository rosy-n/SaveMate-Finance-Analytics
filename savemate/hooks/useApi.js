// hooks/useApi.js
import { useMemo } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * 개발 중 Expo(Metro) 서버가 떠 있는 Mac의 IP를 읽어온다.
 * hostUri 예: "192.168.0.10:8081" → "192.168.0.10"
 * 터널(--tunnel) 주소나 localhost로는 API 서버에 접속할 수 없으므로 사용하지 않는다.
 */
const getDevServerHost = () => {
  if (!__DEV__) return null;

  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];

  if (!host || !/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === '127.0.0.1') {
    return null;
  }
  return host;
};

/**
 * 기본 추론 규칙
 * - HOST: .env의 EXPO_PUBLIC_API_HOST → Expo 서버의 IP(자동) → 기본값
 * - 기본값: ANDROID 에뮬레이터 10.0.2.2, iOS 시뮬레이터/웹 localhost
 * - 포트 기본값: 8080
 */
const guessBaseURL = () => {
  const PORT = process.env.EXPO_PUBLIC_API_PORT ?? '8080';
  const HOST =
    process.env.EXPO_PUBLIC_API_HOST ||
    getDevServerHost() ||
    (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
  return `http://${HOST}:${PORT}`;
};

/**
 * BASE_URL 우선순위
 * 1) .env: EXPO_PUBLIC_API_BASE_URL
 * 2) app.config.js: expo.extra.API_BASE_URL
 * 3) guessBaseURL()
 */
const resolvedBaseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.API_BASE_URL || // 값이 없으면 ""로 주입되므로 || 사용
  guessBaseURL();

export function useApi() {
  return useMemo(() => {
    const BASE_URL = resolvedBaseURL;

    if (!BASE_URL) {
      // 개발 시 즉시 원인 파악용 경고
      console.warn(
        '[useApi] BASE_URL이 비어 있습니다. .env(EXPO_PUBLIC_API_BASE_URL) 또는 app.config.js(expo.extra.API_BASE_URL)를 확인하세요.'
      );
    }

    const req = async (method, path, body) => {
      try {
        const res = await fetch(`${BASE_URL}${path}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // 빈 응답도 허용
        try {
          return await res.json();
        } catch {
          return null;
        }
      } catch (e) {
        // 네트워크/서버 에러 메시지를 통일
        if (e?.message?.startsWith('HTTP ')) throw e;
        throw new Error('네트워크 연결 실패'); // UX 일관화
      }
    };

    return {
      baseURL: BASE_URL,
      get: (p) => req('GET', p),
      post: (p, b) => req('POST', p, b),
      put: (p, b) => req('PUT', p, b),
      delete: (p) => req('DELETE', p),
    };
  }, []);
}
