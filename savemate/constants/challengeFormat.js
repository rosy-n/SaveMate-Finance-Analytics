// constants/challengeFormat.js
// 챌린지 날짜 표시 형식

const dayNumber = (ymd) => Date.parse(`${ymd}T00:00:00Z`) / 86400000;

/** '2026-11-02', '2026-11-30' -> '2026.11.02 ~ 11.30' */
export const formatPeriod = (start, end) =>
  `${start.replaceAll('-', '.')} ~ ${end.slice(5).replaceAll('-', '.')}`;

/** 실패한 챌린지 -> '11월 5일 실패 (시작 4일째)' */
export const formatFailedOn = ({ failedOn, periodStart }) => {
  if (!failedOn) return '';
  const [, month, day] = failedOn.split('-').map(Number);
  return `${month}월 ${day}일 실패 (시작 ${dayNumber(failedOn) - dayNumber(periodStart) + 1}일째)`;
};
