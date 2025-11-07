// hooks/useMonthlyTransactionsFromApi.js
import { useEffect, useMemo, useState } from 'react';
import { useApi } from './useApi';   // ✅ 추가: 공통 API 훅 사용

export default function useMonthlyTransactionsFromApi({ userId, year, month, refresh = 0 }) {
  const api = useApi(); // ✅ baseURL과 공통 get/post 사용
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [items, setItems]     = useState([]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const path = `/api/transactions?uid=${encodeURIComponent(userId)}&year=${year}&month=${month}&expand=true`;
        console.log('📡 GET', api.baseURL + path); // 디버그

        // ✅ 공통 훅으로 호출(상대경로 OK)
        const json = await api.get(path);
        if (!json || json.ok === false) {
          throw new Error(json?.error || '응답 형식이 올바르지 않습니다');
        }

        if (!mounted) return;
        console.log('✅ items:', json.items?.length ?? 0);
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e) {
        console.error('❌ useMonthlyTransactionsFromApi', e);
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (userId && year && month) run();
    return () => { mounted = false; };
  }, [api, userId, year, month, refresh]); // ✅ api 의존성 추가

  // ✅ 안전한 날짜 파싱 (서버가 Date 객체를 줄 수도 있음)
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
    // 같은 날짜 안에서 최신순
    Object.values(map).forEach(arr => arr.sort((a,b) => (a.date > b.date ? -1 : 1)));
    return map;
  }, [items]);

  // 날짜별 합계
  const totalsByDay = useMemo(() => {
    const sums = {};
    for (const [day, arr] of Object.entries(groupedByDay)) {
      let expense = 0, income = 0;
      arr.forEach(t => {
        if ((t.type || '').toLowerCase() === 'income') income += Number(t.amount) || 0;
        else expense += Number(t.amount) || 0;
      });
      sums[day] = { expense, income };
    }
    return sums;
  }, [groupedByDay]);

  // 월 합계
  const monthlyTotals = useMemo(() => {
    let expense = 0, income = 0;
    items.forEach(t => {
      if ((t.type || '').toLowerCase() === 'income') income += Number(t.amount) || 0;
      else expense += Number(t.amount) || 0;
    });
    return { expense, income, count: items.length };
  }, [items]);

  return { loading, error, items, groupedByDay, totalsByDay, monthlyTotals };
}
