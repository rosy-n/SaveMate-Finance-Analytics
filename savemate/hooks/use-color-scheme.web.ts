import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// 구독할 외부 값이 없으므로 아무 일도 하지 않는 구독 함수를 쓴다.
const subscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 *
 * 서버(정적 렌더링)와 첫 하이드레이션에서는 false, 이후 클라이언트에서는 true 를 돌려준다.
 * effect 안에서 state 를 바꾸지 않고도 같은 동작을 낸다.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
