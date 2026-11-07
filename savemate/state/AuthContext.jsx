// state/AuthContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApi } from '../hooks/useApi';
import { setAuthToken, setUnauthorizedHandler } from './authToken';

const STORAGE_KEY = '@savemate/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const api = useApi();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 저장된 로그인(자동 로그인) 복원
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved?.token) return;

        // 토큰이 아직 유효한지 서버에 확인
        const res = await fetch(`${api.baseURL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${saved.token}` },
        });
        const data = await res.json();
        if (!mounted) return;
        if (data?.ok) {
          setAuthToken(saved.token);
          setUser(data.user);
          setToken(saved.token);
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // 네트워크 오류 등 - 자동 로그인은 그냥 건너뛰고 로그인 화면으로 보낸다
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [api]);

  const login = useCallback(async (username, password, remember) => {
    const data = await api.post('/api/auth/login', { username, password });

    setAuthToken(data.token);
    setUser(data.user);
    setToken(data.token);

    if (remember) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token }));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
    return data.user;
  }, [api]);

  const signup = useCallback(async ({ username, password, nickname, email }) => {
    const data = await api.post('/api/auth/signup', { username, password, nickname, email });
    return data.user;
  }, [api]);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  // 서버가 토큰을 거부(401)하면 자동 로그아웃 → 로그인 화면으로 이동
  useEffect(() => {
    setUnauthorizedHandler(() => { logout(); });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout }),
    [user, token, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있어요.');
  return ctx;
}
