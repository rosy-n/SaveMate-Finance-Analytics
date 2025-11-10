// hooks/loadPendingByCreatedAt.js

// .env의 EXPO_PUBLIC_UID (없으면 null)
const ENV_UID =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_UID) || null;

// 안전한 Date 변환
const asDate = (v) => (v?.toDate ? v.toDate() : new Date(v));

/**
 * createdAt 최신순 기준 '미평가 지출' 큐를 가져오는 순수 함수
 * - 절대 훅을 호출하지 않음
 * @param {object} params
 * @param {object} params.api  - useApi() 결과(컴포넌트에서 주입)
 * @param {string} [params.uid] - 기본값: ENV_UID
 * @param {number} [params.limit=200]
 * @param {number} [params.cap=50]
 * @returns {Promise<Array>}
 */
export async function loadPendingByCreatedAt({
  api,
  uid = ENV_UID,
  limit = 200,
  cap = 50,
} = {}) {
  if (!api) throw new Error('loadPendingByCreatedAt: api가 필요합니다');
  if (!uid) console.warn('⚠️ uid가 비어 있습니다(.env 확인)');

  // 1) 이미 평가한 트랜잭션 id 집합
  let ratedSet = new Set();
  try {
    const sat = await api.get(`/api/satisfaction?uid=${uid}`);
    (sat?.items || []).forEach((s) => {
      const k = String(s.transactionId ?? s.tid ?? s.id ?? '');
      if (k) ratedSet.add(k);
    });
  } catch (e) {
    console.warn('⚠️ satisfaction fetch failed → assume none rated:', e);
  }

  // 2) createdAt 최신순 거래 조회 (서버가 정렬을 보장한다는 가정)
  const url = `/api/transactions?uid=${uid}&limit=${limit}&expand=true`;
  let items = [];
  try {
    const res = await api.get(url);
    items = Array.isArray(res?.items) ? res.items : [];
  } catch (e) {
    console.warn('⚠️ transactions(fetch by createdAt) failed:', e);
    return [];
  }

  // 2.5) 혹시 서버가 정렬을 안해주면 클라에서 보강
  items.sort((a, b) => {
    const da = a.createdAt ?? a.date;
    const db = b.createdAt ?? b.date;
    return new Date(db) - new Date(da);
  });

  // 3) 지출(expense) + 미평가만 cap개까지
  const pending = [];
  for (const t of items) {
    const id = String(t.id ?? t.transactionId ?? '');
    if (!id) continue;
    if (String(t.type || '').toLowerCase() !== 'expense') continue;
    if (ratedSet.has(id)) continue;

    pending.push({ ...t, date: asDate(t.date) }); // UI: fmtMonthDayKR(t.date) 그대로
    if (pending.length >= cap) break;
  }

  return pending;
}
