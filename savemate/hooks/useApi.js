// hooks/useApi.js
import { useMemo } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * 기본 추론 규칙
 * - ANDROID 에뮬레이터: 10.0.2.2
 * - iOS 시뮬레이터/웹: localhost
 * - 포트 기본값: 8080
 */
const guessBaseURL = () => {
  const PORT = process.env.EXPO_PUBLIC_API_PORT ?? '8080';
  const HOST =
    process.env.EXPO_PUBLIC_API_HOST ??
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
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Constants.expoConfig?.extra?.API_BASE_URL ??
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
