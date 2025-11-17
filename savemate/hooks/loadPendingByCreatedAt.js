// hooks/loadPendingByCreatedAt.js

// .env의 EXPO_PUBLIC_UID (없으면 null)
const ENV_UID =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_UID) || null;

// 안전한 Date 변환
const asDate = (v) => (v?.toDate ? v.toDate() : new Date(v));

// ──────────────────────────────────────────────────────────────
// 재도입: 모듈 전역 캐시 + in-flight dedupe
// ──────────────────────────────────────────────────────────────
const _cache = new Map();    // key -> { ts, data }
const _inflight = new Map(); // key -> Promise
const TTL_MS = 5000; // 5초 TTL

/**
 * 전체 미평가 지출 큐를 가져오는 순수 함수 (캐싱 적용)
 * @param {object} params
 * @param {object} params.api  - useApi() 결과(컴포넌트에서 주입)
 * @param {string} [params.uid] - 기본값: ENV_UID
 * @param {number} [params.cap=50] - 화면에 올릴 최대 개수
 * @returns {Promise<Array>}
 */
export async function loadPendingByCreatedAt({
  api,
  uid = ENV_UID,
  cap = 50,
} = {}) {
  // loadPendingByCreatedAt 함수가 실제로 호출되는지 확인용 코드임. 잘 확인되는 지울거임
  console.log("🐰 loadPendingByCreatedAt 호출됨! uid=", uid);
  if (!api) throw new Error('loadPendingByCreatedAt: api가 필요합니다');
  if (!uid) console.warn('⚠️ uid가 비어 있습니다(.env 확인)');

  // 캐싱/디듀프 키 설정
  const key = `${uid || 'nouid'}:${cap}`;
  const now = Date.now();
  const hit = _cache.get(key);
  
  if (hit && now - hit.ts < TTL_MS) return hit.data; // 캐시 히트
  if (_inflight.has(key)) return await _inflight.get(key); // 중복 요청 방지

  const p = (async () => {
    // 단일 최적화 쿼리: isRated=false인 expense만 요청
    const txURL = `/api/transactions/unrated?uid=${encodeURIComponent(uid)}&limit=${cap}`;

    let items = [];
    try {
      const res = await api.get(txURL);
      items = Array.isArray(res?.items) ? res.items : [];
    } catch (e) {
      console.warn('⚠️ transactions(fetch unrated) failed:', e);
      return [];
    }

    // 큐에 넣을 최종 목록
    const pending = [];
    for (const t of items) {
      pending.push({ ...t, date: asDate(t.date) });
      if (pending.length >= cap) break; 
    }
    
    return pending;
  })(); // P Promise 끝

  _inflight.set(key, p);
  try {
    const data = await p;
    _cache.set(key, { ts: Date.now(), data }); // 캐시 저장
    return data;
  } finally {
    _inflight.delete(key); // 인플라이트 제거
  }
}