// hooks/useMonthlyTransactionsFromApi.js
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from './useApi';

// 프로세스 전역(앱 생존 동안 유지) 캐시
// key: `${uid}:${year}-${month}` -> { ts, json }
const monthCache = new Map();
// 중복 호출 방지용 in-flight promise
const inflight = new Map();
const DEDUPE_MS = 3000; // 3초 내 동일 키 재요청은 캐시 재사용

export default function useMonthlyTransactionsFromApi({ userId, year, month, refresh = 0 }) {
  const { get, baseURL } = useApi();       // ✅ 함수만 구조분해 (의존성 안정화)
  const getRef = useRef(get);              // ✅ get 참조 고정
  const baseURLRef = useRef(baseURL);
  useEffect(() => { getRef.current = get; }, [get]);
  useEffect(() => { baseURLRef.current = baseURL; }, [baseURL]);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [items, setItems]     = useState([]);

  useEffect(() => {
    let alive = true;
    if (!userId || !year || !month) return;

    const key = `${userId}:${year}-${String(month).padStart(2,'0')}`;
    const path = `/api/transactions?uid=${encodeURIComponent(userId)}&year=${year}&month=${month}&expand=true`;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        // 1) Deduping window & 캐시 히트
        const now = Date.now();
        const cached = monthCache.get(key);
        if (cached && now - cached.ts < DEDUPE_MS) {
          if (!alive) return;
          setItems(Array.isArray(cached.json?.items) ? cached.json.items : []);
          setLoading(false);
          return;
        }
        if (cached && refresh === 0) {
          // 최신성 엄격하지 않으면 즉시 캐시 사용 + 백그라운드 갱신(Optional)
          if (!alive) return;
          setItems(Array.isArray(cached.json?.items) ? cached.json.items : []);
          // setLoading(false);  // 필요시 즉시 로딩 종료
          // 이후 백그라운드 갱신을 하고 싶다면 여기서 계속 진행
        }

        // 2) In-flight 중복 억제
        if (inflight.has(key)) {
          const json = await inflight.get(key);
          if (!alive) return;
          setItems(Array.isArray(json?.items) ? json.items : []);
          setLoading(false);
          return;
        }

        // 3) 실제 호출
        const controller = new AbortController();
        const p = (async () => {
          console.log('📡 GET', baseURLRef.current + path);
          const json = await getRef.current(path, { signal: controller.signal });
          if (!json || json.ok === false) {
            throw new Error(json?.error || '응답 형식이 올바르지 않습니다');
          }
          return json;
        })();

        inflight.set(key, p);
        const json = await p;
        inflight.delete(key);

        // 4) 캐시 저장
        monthCache.set(key, { ts: Date.now(), json });

        if (!alive) return;
        console.log('✅ items:', json.items?.length ?? 0);
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e) {
        inflight.delete(key);
        if (!alive) return;
        // AbortError는 조용히 무시 가능
        if (e?.name !== 'AbortError') {
          console.error('❌ useMonthlyTransactionsFromApi', e);
          setError(e);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => { alive = false; };
  }, [userId, year, month, refresh]); // ✅ api 제거(안정화)

  // ✅ 안전한 날짜 파싱
  const getDay = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    const day = Number.isFinite(dt.getTime()) ? dt.getDate() : NaN;
    return day;
  };

  // 날짜별 그룹
  const groupedByDay = useMemo(() => {
    const map = {};
    for (const t of items) {
      const day = getDay(t?.date);
      if (!day) continue;
      if (!map[day]) map[day] = [];
      map[day].push(t);
    }
    Object.values(map).forEach(arr =>
      arr.sort((a,b) => (new Date(a.date) > new Date(b.date) ? -1 : 1))
    );
    return map;
  }, [items]);

  // 날짜별 합계
  const totalsByDay = useMemo(() => {
    const sums = {};
    for (const [day, arr] of Object.entries(groupedByDay)) {
      let expense = 0, income = 0;
      for (const t of arr) {
        if ((t.type || '').toLowerCase() === 'income') income += Number(t.amount) || 0;
        else expense += Number(t.amount) || 0;
      }
      sums[day] = { expense, income };
    }
    return sums;
  }, [groupedByDay]);

  // 월 합계
  const monthlyTotals = useMemo(() => {
    let expense = 0, income = 0;
    for (const t of items) {
      if ((t.type || '').toLowerCase() === 'income') income += Number(t.amount) || 0;
      else expense += Number(t.amount) || 0;
    }
    return { expense, income, count: items.length };
  }, [items]);

  return { loading, error, items, groupedByDay, totalsByDay, monthlyTotals };
}
