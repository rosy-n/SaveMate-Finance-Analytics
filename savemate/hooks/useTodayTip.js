// hooks/useTodayTip.js
// 오늘의 절약팁. 서버는 사용자별로 하루 한 번 Gemini 로 팁을 만들어 캐시한다.
// 첫 생성은 오래 걸릴 수 있어서 기본 팁을 먼저 보여주고, 도착하면 개인화된 팁으로 바꾼다.
import { useEffect, useState } from 'react';
import { getAppToday } from '../constants/appDate';
import { useApi } from './useApi';

const ROTATE_MS = 5000;

const DEFAULT_TIPS = [
  { content: '오늘은 카페나 간식처럼 자주 나가는 소액 지출을 한 번만 줄여 보세요.' },
  { content: '배달 주문 전에 집에 있는 재료로 대체할 수 있는지 먼저 확인해 보세요.' },
  { content: '구매 버튼을 누르기 전에 내일도 필요할지 10초만 생각해 보세요.' },
  { content: '이번 주에 꼭 필요한 지출만 미리 적어 두면 충동구매를 줄일 수 있어요.' },
  { content: '구독 서비스 중에 이번 달에 쓰지 않은 것이 있는지 확인해 보세요.' },
];

// 홈 화면이 다시 마운트되어도 유지한다.
const tipsByKey = new Map();
const inflight = new Map();
let currentIndex = Math.floor(Math.random() * DEFAULT_TIPS.length);

function fetchTips(api, uid, key) {
  if (!inflight.has(key)) {
    const request = api
      .get(`/api/tips/today?uid=${encodeURIComponent(uid)}`)
      .then((res) => {
        const tips = res?.tip?.tips ?? [];
        // 서버 오류 안내 문구는 팁으로 저장하지 않는다.
        if (res?.meta?.degraded || tips.length === 0) return null;
        tipsByKey.set(key, tips);
        return tips;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, request);
  }
  return inflight.get(key);
}

export default function useTodayTip(uid) {
  const api = useApi();
  const key = `${uid}:${getAppToday()}`;

  const [tips, setTips] = useState(() => tipsByKey.get(key) ?? DEFAULT_TIPS);
  const [index, setIndex] = useState(currentIndex);

  useEffect(() => {
    if (!uid || tipsByKey.has(key)) return;
    let mounted = true;
    // 실패하면 기본 팁을 계속 보여주고, 다음에 홈에 들어올 때 다시 시도한다.
    fetchTips(api, uid, key)
      .then((loaded) => {
        if (mounted && loaded) setTips(loaded);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [api, uid, key]);

  useEffect(() => {
    const timer = setInterval(() => {
      currentIndex += 1;
      setIndex(currentIndex);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  return tips[index % tips.length];
}
