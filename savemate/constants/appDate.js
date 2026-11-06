// 앱 전체에서 "오늘"로 쓰는 날짜.
// .env 에 EXPO_PUBLIC_FAKE_TODAY=YYYY-MM-DD 를 넣으면 그 날짜로 고정되고(시:분:초는 실제 시각),
// 값을 지우거나 비우면 실제 오늘 날짜를 사용한다. (Metro 재시작 필요)
export function getAppNow() {
  const real = new Date();
  const fake = process.env.EXPO_PUBLIC_FAKE_TODAY;
  if (!fake) return real;

  const [y, m, d] = String(fake).trim().split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, real.getHours(), real.getMinutes(), real.getSeconds());
  return Number.isNaN(dt.getTime()) ? real : dt;
}

// getAppNow() 의 날짜를 'YYYY-MM-DD' 로 반환한다.
export function getAppToday() {
  const now = getAppNow();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
