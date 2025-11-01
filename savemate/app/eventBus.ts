// app/eventBus.ts
type Handler = (...args: any[]) => void;
const handlers: Record<string, Set<Handler>> = {};

/** 간단한 RN 호환 이벤트 버스 */
export const appBus = {
  on(event: string, cb: Handler) {
    (handlers[event] ??= new Set()).add(cb);
    // 구독 해제 함수 반환
    return () => handlers[event]?.delete(cb);
  },
  off(event: string, cb: Handler) {
    handlers[event]?.delete(cb);
  },
  emit(event: string, ...args: any[]) {
    handlers[event]?.forEach(fn => fn(...args));
  },
};
