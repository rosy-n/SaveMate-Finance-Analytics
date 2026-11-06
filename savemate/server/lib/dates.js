// server/lib/dates.js
// 거래 날짜는 시각 없는 "날짜(date)"로 저장한다. 한국 시간(KST) 기준으로 날짜를 계산한다.

const kstFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Date -> 'YYYY-MM-DD' (KST) */
const toKstDateString = (d) => kstFormatter.format(d);

const pad2 = (n) => String(n).padStart(2, '0');

/** 해당 월 1일 'YYYY-MM-01' */
const monthStart = (y, m) => `${y}-${pad2(m)}-01`;

/** 다음 달 1일 'YYYY-MM-01' */
const nextMonthStart = (y, m) => (m === 12 ? monthStart(y + 1, 1) : monthStart(y, m + 1));

/** year, month 에서 N개월 전/후 (month: 1~12) */
function shiftYearMonth(year, month, delta) {
  const base = month - 1 + delta;
  return { year: year + Math.floor(base / 12), month: ((base % 12) + 12) % 12 + 1 };
}

/** 'YYYY-MM-DD' -> 해당 월 1일 'YYYY-MM-01' */
const monthStartOf = (ymd) => `${ymd.slice(0, 7)}-01`;

module.exports = { toKstDateString, monthStart, nextMonthStart, shiftYearMonth, monthStartOf };
