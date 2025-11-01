// hooks/useMonthlyTransactionsFromApi.js
import { useEffect, useMemo, useState } from 'react';

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL || '';

export default function useMonthlyTransactionsFromApi({ userId, year, month, refresh = 0 }) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [items, setItems]     = useState([]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const url = `${BASE}/api/transactions?uid=${encodeURIComponent(userId)}&year=${year}&month=${month}&expand=true`;
        console.log('📡 GET', url); // 디버그

        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || `HTTP ${res.status}`);
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
  }, [userId, year, month, refresh]);

  // 날짜별 그룹
  const groupedByDay = useMemo(() => {
    const map = {};
    for (const t of items) {
      const d = (t.date || '').split('-')[2]; // 'YYYY-MM-DD'
      const day = Number(d);
      if (!day) continue;
      if (!map[day]) map[day] = [];
      map[day].push(t);
    }
    // 같은 날짜 안에서 최신순 정렬(선택)
    Object.values(map).forEach(arr => arr.sort((a,b) => (a.date > b.date ? -1 : 1)));
    return map;
  }, [items]);

  // 날짜별 합계(지출만 음수/양수 규칙 없이 절대값 누적)
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
