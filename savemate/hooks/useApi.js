// hooks/useApi.js
import { useMemo } from 'react';
import { Platform } from 'react-native';

/**
 * BASE URL 우선순위
 * 1) EXPO_PUBLIC_API_BASE_URL (권장)
 * 2) EXPO_PUBLIC_API_HOST + EXPO_PUBLIC_API_PORT
 * 3) 시뮬레이터별 기본값 추정:
 *    - Android 에뮬레이터: http://10.0.2.2:3000
 *    - iOS 시뮬레이터:    http://localhost:3000
 */
const guessBaseURL = () => {
  const PORT = process.env.EXPO_PUBLIC_API_PORT ?? '3000';
  const HOST =
    process.env.EXPO_PUBLIC_API_HOST ??
    (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
  return `http://${HOST}:${PORT}`;
};

// const BASE_URL =
//   process.env.EXPO_PUBLIC_API_BASE_URL ??
//   guessBaseURL();

const BASE_URL = 'http://172.20.5.9:8080';


export function useApi() {
  return useMemo(() => {
    const req = async (method, path, body) => {
      const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }).catch(() => { throw new Error('네트워크 연결 실패'); });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // 빈 응답도 허용
      try { return await res.json(); } catch { return null; }
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
