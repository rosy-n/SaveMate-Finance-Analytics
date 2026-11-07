// server/lib/llmGuard.js
// Gemini 를 "실제로 호출하기 직전"(캐시 미스일 때)에만 쓰는 호출 제한 장치.
// 캐시된 응답에는 적용하지 않으므로 평소 사용에는 영향이 없다.
//
//  - 시간당 생성 한도: 거래 추가(캐시 삭제) → 리포트 조회를 반복해 호출을 늘리는 것을 막는다.
//  - 실패 쿨다운: Gemini 장애 중 화면을 열 때마다 재시도가 쌓이는 것을 막는다.
//
// 상태는 서버 메모리에만 있다. 재시작하면 초기화되고 서버가 여러 대면 공유되지 않지만,
// 비용 폭주 방지 용도로는 충분하다.

// Gemini 요청 1건의 제한 시간(ms). SDK 의 requestOptions.timeout 으로 넘기면 실제로 요청이 abort 된다.
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 15000;

const MAX_TRACKED_USERS = 1000;

function createGenerationGuard({
  limit = 10,
  windowMs = 60 * 60 * 1000,
  cooldownMs = 60 * 1000,
  now = () => Date.now(),
} = {}) {
  const hits = new Map(); // userId -> 호출 시각 배열
  const failedAt = new Map(); // userId -> 마지막 실패 시각

  const sweep = (t) => {
    for (const [id, arr] of hits) {
      if (!arr.some((h) => t - h < windowMs)) hits.delete(id);
    }
    for (const [id, at] of failedAt) {
      if (t - at >= cooldownMs) failedAt.delete(id);
    }
  };

  return {
    /** 호출해도 되는지 확인하고, 허용하면 이번 시도를 기록한다. */
    check(userId) {
      const t = now();
      if (hits.size + failedAt.size > MAX_TRACKED_USERS) sweep(t);

      const failed = failedAt.get(userId);
      if (failed != null && t - failed < cooldownMs) {
        return { ok: false, reason: 'cooldown' };
      }

      const recent = (hits.get(userId) || []).filter((h) => t - h < windowMs);
      if (recent.length >= limit) {
        hits.set(userId, recent);
        return { ok: false, reason: 'limit' };
      }

      recent.push(t);
      hits.set(userId, recent);
      return { ok: true };
    },
    /** 생성에 실패했다. 쿨다운 동안 재호출을 막는다. */
    fail(userId) {
      failedAt.set(userId, now());
    },
    /** 생성에 성공했다. 쿨다운을 해제한다. */
    success(userId) {
      failedAt.delete(userId);
    },
  };
}

module.exports = { createGenerationGuard, LLM_TIMEOUT_MS };
