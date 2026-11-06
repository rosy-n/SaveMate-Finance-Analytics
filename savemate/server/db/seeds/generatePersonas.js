// server/db/seeds/generatePersonas.js
// 페르소나 정의로 personas/*.json 을 만든다. 시드값이 고정이라 항상 같은 결과가 나온다.
//   npm run seed:generate  →  검토 후  npm run seed
const fs = require('fs');
const path = require('path');

const START = '2026-08-01';
const END = '2026-11-06';
// 나중에 추가한 달. 난수를 따로 써서 START 이후 데이터가 바뀌지 않게 한다.
const ADDED_MONTHS = [{ start: '2026-07-01', end: '2026-07-31' }];
const FIRST_DATE = ADDED_MONTHS[0].start;
const OUT_DIR = path.join(__dirname, 'personas');
const UNRATED_RECENT_DAYS = 4; // 최근 거래는 아직 평가 전 상태로 둔다.

const REASONS = {
  dissatisfied: ['품질 불만', '가격 불만', '과소비 / 불필요', '경제적 / 사회적 압박', '감정 후회', '기타'],
  neutral: ['평범함', '일상적 / 습관적', '대안 없음', '기타'],
  satisfied: ['필요 충족', '감정 충족', '가성비 만족', '경험 / 성장', '사회적 유대', '기타'],
};

// ── 날짜 / 난수 ──
const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekday = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();
const pad = (n) => String(n).padStart(2, '0');

function makeRng(name) {
  let a = [...name].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const weighted = (rng, entries) => {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
};

// ── 소비 규칙 ──
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];
const ALL = [0, 1, 2, 3, 4, 5, 6];

/**
 * 날짜마다 확률 p 로 발생하는 지출.
 * items: [메모, 최소금액, 최대금액]
 * rate:  { satisfied|neutral|dissatisfied: [가중치, 사유[], 평가메모[]?] }
 */
const rule = (category, spendingBackground, pay, p, days, items, rate, window = {}) =>
  ({ category, spendingBackground, pay, p, days, items, rate, ...window });

/** 정해진 날짜(문자열) 또는 매월 며칠(숫자)의 지출. rating 이 null 이면 평가하지 않는다. */
const fixed = (when, category, memo, amount, spendingBackground, paymentMethod, rating) =>
  ({ when, category, memo, amount, spendingBackground, paymentMethod, rating });
const r = (emotion, reasons, memo = '') => ({ emotion, reasons, memo });

const income = (when, source, memo, amount) => ({ when, source, memo, amount });

const CHECK = [['체크카드', 9], ['현금', 1]];
const CREDIT = [['신용카드', 9], ['체크카드', 1]];
const MIXED = [['신용카드', 6], ['체크카드', 3], ['현금', 1]];

// ── 페르소나 ──
const PERSONAS = [
  {
    key: 'seoyeon',
    account: { nickname: '서연' },
    profile: {
      name: '서연', age: 22, job: '대학생',
      income: '월 80만 원 (용돈 40만 + 카페 알바 40만)',
      pattern: '카페·간식·편의점 소액 결제가 잦은 체크카드 사용자',
      goal: '새는 돈 줄이기',
      expectedReport: '불필요·과소비형, 일상적/습관적 사유가 많음',
    },
    incomes: [
      income(1, '용돈', '부모님 용돈', 400000),
      income(5, '기타', '카페 아르바이트 급여', 400000),
      income('2026-09-24', '용돈', '추석 할머니 용돈', 100000),
    ],
    fixed: [
      fixed(3, '공과금(주거/세금/통신/보험)', '휴대폰 요금', 33000, '필수/생존', '체크카드', r('neutral', ['대안 없음'])),
      fixed(2, '교통/자동차', '교통카드 충전', 50000, '필수/생존', '체크카드', r('neutral', ['일상적 / 습관적'])),
      fixed(12, '문화/여가', '유튜브 프리미엄 구독', 14900, '여가', '체크카드', r('neutral', ['일상적 / 습관적', '기타'], '잘 안 보는데 계속 나가는 중')),
      fixed(10, '투자/저축', '청년 적금 자동이체', 50000, '투자(저축)/미래지향', '체크카드', r('satisfied', ['필요 충족'])),
      fixed('2026-07-11', '교통/자동차', '친구들이랑 바다 당일치기 기차표', 28600, '여가', '체크카드', r('satisfied', ['경험 / 성장', '사회적 유대'])),
      fixed('2026-07-18', '패션/쇼핑', '에이블리 여름 샌들', 35000, '쾌락/감정', '체크카드', r('dissatisfied', ['과소비 / 불필요'], '비슷한 샌들이 이미 있는데 세일이라 샀다')),
      fixed('2026-07-24', '교육', '방학 코딩 온라인 강의', 39000, '자아실현/자기계발', '체크카드', r('neutral', ['평범함'], '방학 끝나기 전에 다 듣기')),
      fixed('2026-08-22', '패션/쇼핑', '에이블리 원피스', 39000, '자기표현/이미지·SNS', '체크카드', r('dissatisfied', ['과소비 / 불필요'], '한 번 입고 안 입음')),
      fixed('2026-09-03', '교육', '전공 교재 중고 구매', 18000, '자아실현/자기계발', '현금', r('satisfied', ['필요 충족', '가성비 만족'])),
      fixed('2026-09-07', '교육', '토익 인강 수강권', 49000, '자아실현/자기계발', '체크카드', r('neutral', ['평범함'], '아직 3강밖에 못 들음')),
      fixed('2026-09-23', '경조/선물/후원', '추석 부모님 선물 홍삼', 35000, '사회/관계', '체크카드', r('satisfied', ['사회적 유대'])),
      fixed('2026-10-14', '의료/건강', '감기 진료비와 약값', 9800, '필수/생존', '체크카드', r('neutral', ['대안 없음'])),
      fixed('2026-10-24', '패션/쇼핑', '지그재그 니트 충동구매', 42000, '쾌락/감정', '체크카드', r('dissatisfied', ['과소비 / 불필요', '품질 불만'], '괜히 샀다. 비슷한 니트가 이미 있음')),
      fixed('2026-11-03', '식비', '동기들이랑 곱창', 27000, '사회/관계', '체크카드', null),
      fixed('2026-11-04', '식비', '배달 마라탕 혼밥', 21500, '쾌락/감정', '체크카드', null),
      fixed('2026-11-05', '식비', '시험 기간 야식 치킨', 24000, '쾌락/감정', '체크카드', null),
    ],
    rules: [
      rule('카페/간식', '쾌락/감정', CHECK, 1.0, WEEKDAYS, [
        ['메가커피 아이스 아메리카노', 2000, 2000], ['컴포즈 바닐라라떼', 3500, 3500],
        ['스타벅스 프라푸치노', 6900, 6900], ['학교 앞 크로플', 6500, 7500],
        ['편의점 과자랑 젤리', 2800, 5200], ['편의점 에너지드링크', 2200, 2800],
        ['공강 시간 카페 라떼', 4500, 5500], ['아이스크림 할인점', 2000, 4500],
      ], {
        neutral: [6, ['일상적 / 습관적', '평범함']],
        dissatisfied: [3, ['과소비 / 불필요'], ['습관처럼 또 샀다', '안 마셔도 되는 커피였음', '괜히 샀다, 배도 안 고팠음']],
        satisfied: [1, ['감정 충족']],
      }),
      rule('카페/간식', '쾌락/감정', CHECK, 0.7, WEEKEND, [
        ['친구랑 디저트 카페', 9500, 13500], ['붕어빵', 2000, 3000], ['배달 탕후루', 4000, 7000], ['올리브영 앞 버블티', 5500, 6500],
      ], {
        satisfied: [4, ['감정 충족']], neutral: [4, ['일상적 / 습관적']], dissatisfied: [2, ['과소비 / 불필요']],
      }),
      rule('식비', '필수/생존', CHECK, 0.4, WEEKDAYS, [
        ['학식 정식', 5500, 6000], ['학교 앞 김밥이랑 라면', 6500, 8000], ['편의점 도시락', 4800, 6000], ['덮밥집 점심', 8500, 10000],
      ], {
        neutral: [7, ['일상적 / 습관적', '평범함']], satisfied: [3, ['가성비 만족', '필요 충족']],
      }, { from: '2026-09-01' }),
      rule('식비', '쾌락/감정', CHECK, 0.17, ALL, [
        ['배달 떡볶이', 16000, 19500], ['마라탕', 12000, 15000], ['배달 치킨 반반', 19000, 23000], ['혼자 파스타', 14000, 17000],
      ], {
        satisfied: [4, ['감정 충족']], neutral: [2, ['평범함']], dissatisfied: [4, ['과소비 / 불필요', '가격 불만'], ['배달비가 더 아까움', '집에 밥 있었는데 시켰다']],
      }),
      rule('식비', '사회/관계', CHECK, 0.28, WEEKEND, [
        ['친구랑 브런치', 16000, 21000], ['과 친구들이랑 삼겹살', 15000, 20000],
      ], {
        satisfied: [8, ['사회적 유대', '감정 충족']], neutral: [2, ['평범함']],
      }),
      rule('생활(마트 잡화)', '필수/생존', CHECK, 0.1, ALL, [
        ['다이소 생활용품', 3000, 8000], ['올리브영 샴푸', 11000, 16000], ['문구점 필기구', 3500, 6500],
      ], {
        neutral: [5, ['평범함']], satisfied: [4, ['필요 충족', '가성비 만족']], dissatisfied: [1, ['과소비 / 불필요']],
      }),
      rule('뷰티/미용', '자기표현/이미지·SNS', CHECK, 0.06, ALL, [
        ['올리브영 틴트', 11000, 15000], ['마스크팩 세트', 9000, 14000], ['쿠션 리필', 18000, 22000],
      ], {
        satisfied: [4, ['감정 충족']], dissatisfied: [4, ['과소비 / 불필요']], neutral: [2, ['평범함']],
      }),
      rule('패션/쇼핑', '쾌락/감정', CHECK, 0.05, ALL, [
        ['에이블리 티셔츠', 14000, 22000], ['지그재그 양말 세트', 8000, 12000], ['에이블리 가방', 25000, 33000],
      ], {
        dissatisfied: [6, ['과소비 / 불필요', '품질 불만'], ['사진이랑 달랐음', '필요 없는데 할인해서 샀다']],
        neutral: [2, ['평범함']], satisfied: [2, ['감정 충족']],
      }),
      rule('문화/여가', '여가', CHECK, 0.08, ALL, [
        ['영화 관람', 14000, 15000], ['코인노래방', 2000, 5000], ['인생네컷', 4000, 5000],
      ], { satisfied: [7, ['감정 충족', '사회적 유대']], neutral: [3, ['평범함']] }),
      rule('술/유흥', '사회/관계', CHECK, 0.14, [4, 5], [
        ['동기들이랑 맥주', 14000, 22000], ['과 모임 뒤풀이', 18000, 26000],
      ], { satisfied: [6, ['사회적 유대']], neutral: [2, ['평범함']], dissatisfied: [2, ['과소비 / 불필요']] }, { from: '2026-09-01' }),
      rule('교통/자동차', '쾌락/감정', CHECK, 0.05, ALL, [['늦어서 탄 택시', 8000, 14000]], {
        dissatisfied: [7, ['과소비 / 불필요'], ['조금만 일찍 나왔으면 안 썼을 돈']], neutral: [3, ['대안 없음']],
      }),
      rule('경조/선물/후원', '사회/관계', CHECK, 0.025, ALL, [['친구 생일 선물', 15000, 28000]], {
        satisfied: [7, ['사회적 유대']], neutral: [3, ['평범함']],
      }),
    ],
    ratedRate: 0.7,
    challenges: [
      { category: '카페/간식', periodStart: '2026-09-07', periodEnd: '2026-09-30', expect: 'failed' },
      { category: '카페/간식', periodStart: '2026-10-05', periodEnd: '2026-10-31', expect: 'completed' },
      { category: '카페/간식', periodStart: '2026-11-02', periodEnd: '2026-11-30', expect: 'active' },
      { category: '식비', periodStart: '2026-11-02', periodEnd: '2026-11-30', expect: 'failed' },
    ],
  },
  {
    key: 'jimin',
    account: { nickname: '지민' },
    profile: {
      name: '지민', age: 26, job: '신입 마케터',
      income: '월급 290만 원',
      pattern: '야근 후 배달과 심야 쇼핑, 신용카드 위주',
      goal: '스트레스 해소 소비 줄이기',
      expectedReport: '감정적 소비형, 패션 이상치, 비쌀수록 불만족(음의 상관)',
    },
    incomes: [income(5, '월급', '월급', 2900000), income('2026-09-18', '기타', '당근 중고 판매', 45000)],
    fixed: [
      fixed(1, '공과금(주거/세금/통신/보험)', '오피스텔 월세', 550000, '필수/생존', '체크카드', null),
      fixed(15, '공과금(주거/세금/통신/보험)', '관리비와 공과금', 92000, '필수/생존', '체크카드', r('neutral', ['대안 없음'])),
      fixed(20, '공과금(주거/세금/통신/보험)', '휴대폰 요금', 62000, '필수/생존', '신용카드', r('neutral', ['일상적 / 습관적'])),
      fixed(6, '투자/저축', '적금 자동이체', 300000, '투자(저축)/미래지향', '체크카드', null),
      fixed(10, '교통/자동차', '교통비 후불 결제', 68000, '필수/생존', '신용카드', r('neutral', ['대안 없음'])),
      fixed('2026-07-10', '패션/쇼핑', '여름 세일 충동구매 샌들', 129000, '쾌락/감정', '신용카드', r('dissatisfied', ['감정 후회'], '야근하고 기분 풀려고 샀는데 후회')),
      fixed('2026-07-18', '여행/숙박', '혼자 떠난 강릉 1박 숙소', 148000, '쾌락/감정', '신용카드', r('neutral', ['평범함'], '쉬긴 했는데 카드값이 걱정됨')),
      fixed('2026-07-24', '패션/쇼핑', '마감 끝나고 산 린넨 원피스', 168000, '쾌락/감정', '신용카드', r('dissatisfied', ['감정 후회', '과소비 / 불필요'], '보상 심리로 샀다')),
      fixed('2026-08-13', '패션/쇼핑', '새벽에 산 여름 원피스 2벌', 148000, '쾌락/감정', '신용카드', r('dissatisfied', ['감정 후회', '과소비 / 불필요'], '야근 끝나고 스트레스 받아서 샀는데 태그도 안 뗌')),
      fixed('2026-08-28', '뷰티/미용', '백화점 향수', 189000, '쾌락/감정', '신용카드', r('dissatisfied', ['감정 후회'], '기분 풀려고 샀는데 카드값 보고 후회')),
      fixed('2026-09-11', '패션/쇼핑', '마감 주 충동구매 트렌치코트', 279000, '쾌락/감정', '신용카드', r('dissatisfied', ['감정 후회', '가격 불만'], '보상 심리로 샀다. 아직 한 번도 안 입음')),
      fixed('2026-09-26', '여행/숙박', '추석 연휴 혼자 호캉스', 238000, '쾌락/감정', '신용카드', r('neutral', ['평범함'], '쉬긴 했는데 이 돈까지 쓸 일은 아니었음')),
      fixed('2026-10-16', '패션/쇼핑', '퇴근길에 산 가죽 가방', 325000, '쾌락/감정', '신용카드', r('dissatisfied', ['감정 후회', '과소비 / 불필요'], '팀장 피드백 듣고 홧김에 결제')),
      fixed('2026-10-29', '뷰티/미용', '피부과 패키지 결제', 220000, '자기표현/이미지·SNS', '신용카드', r('dissatisfied', ['가격 불만', '감정 후회'])),
      fixed('2026-11-03', '패션/쇼핑', '야근 후 온라인 쇼핑 코트', 169000, '쾌락/감정', '신용카드', null),
      fixed('2026-11-05', '패션/쇼핑', '새벽 라이브 방송 니트', 59000, '쾌락/감정', '신용카드', null),
    ],
    rules: [
      rule('식비', '필수/생존', CREDIT, 0.75, WEEKDAYS, [
        ['회사 앞 점심', 9000, 12000], ['샐러드 점심', 9500, 11000], ['구내식당', 6500, 6500], ['김치찌개 점심', 9000, 10000],
      ], { satisfied: [5, ['필요 충족', '가성비 만족']], neutral: [5, ['일상적 / 습관적']] }),
      rule('식비', '쾌락/감정', CREDIT, 0.32, ALL, [
        ['야근 후 배달 족발', 32000, 41000], ['배달 마라샹궈', 26000, 34000], ['늦은 밤 치킨', 22000, 28000],
        ['배달 초밥', 28000, 37000], ['배달 떡볶이 세트', 21000, 27000],
      ], {
        dissatisfied: [6, ['감정 후회', '과소비 / 불필요'], ['스트레스 받아서 시켰는데 반 남김', '먹고 나니 더 피곤함']],
        neutral: [3, ['일상적 / 습관적']], satisfied: [1, ['감정 충족']],
      }),
      rule('카페/간식', '필수/생존', CREDIT, 0.6, WEEKDAYS, [
        ['출근길 아메리카노', 3000, 4700], ['오후 라떼', 4500, 5500], ['편의점 초콜릿', 1800, 3500],
      ], { satisfied: [5, ['감정 충족', '필요 충족']], neutral: [5, ['일상적 / 습관적']] }),
      rule('카페/간식', '쾌락/감정', CREDIT, 0.3, WEEKEND, [
        ['주말 혼자 카페', 7500, 12000], ['베이커리 소금빵', 5000, 9000],
      ], { satisfied: [8, ['감정 충족']], neutral: [2, ['평범함']] }),
      rule('패션/쇼핑', '쾌락/감정', CREDIT, 0.1, ALL, [
        ['무신사 셔츠', 39000, 69000], ['29CM 니트', 49000, 89000], ['심야 온라인 쇼핑 신발', 59000, 99000], ['액세서리 귀걸이', 19000, 35000],
      ], {
        dissatisfied: [7, ['감정 후회', '과소비 / 불필요'], ['기분 전환하려고 샀는데 금방 후회', '비슷한 게 집에 있음']],
        neutral: [2, ['평범함']], satisfied: [1, ['감정 충족']],
      }),
      rule('뷰티/미용', '자기표현/이미지·SNS', CREDIT, 0.06, ALL, [
        ['올리브영 스킨케어', 22000, 45000], ['네일 아트', 45000, 65000], ['미용실 커트', 28000, 35000],
      ], { neutral: [4, ['평범함']], dissatisfied: [3, ['감정 후회', '가격 불만']], satisfied: [3, ['감정 충족']] }),
      rule('생활(마트 잡화)', '필수/생존', MIXED, 0.1, ALL, [
        ['쿠팡 생필품', 15000, 32000], ['마트 장보기', 18000, 35000], ['다이소', 3000, 8000],
      ], { neutral: [6, ['일상적 / 습관적']], satisfied: [4, ['필요 충족']] }),
      rule('술/유흥', '사회/관계', CREDIT, 0.1, [4, 5], [
        ['회사 동기들이랑 맥주', 22000, 35000], ['대학 친구들 와인바', 35000, 48000],
      ], { satisfied: [5, ['사회적 유대', '감정 충족']], neutral: [3, ['평범함']], dissatisfied: [2, ['가격 불만']] }),
      rule('문화/여가', '여가', CREDIT, 0.07, WEEKEND.concat([5]), [
        ['영화 관람', 15000, 16000], ['전시회', 18000, 22000], ['필라테스 체험', 25000, 33000],
      ], { satisfied: [8, ['감정 충족', '경험 / 성장']], neutral: [2, ['평범함']] }),
      rule('교통/자동차', '쾌락/감정', CREDIT, 0.1, WEEKDAYS, [['야근 후 택시', 14000, 23000]], {
        neutral: [6, ['대안 없음']], dissatisfied: [4, ['가격 불만']],
      }),
      rule('의료/건강', '필수/생존', CREDIT, 0.03, WEEKDAYS, [['두통약과 영양제', 12000, 28000], ['내과 진료', 8000, 14000]], {
        neutral: [6, ['대안 없음']], satisfied: [4, ['필요 충족']],
      }),
      rule('교육', '자아실현/자기계발', CREDIT, 0.012, WEEKDAYS, [['마케팅 온라인 강의', 39000, 79000]], {
        neutral: [6, ['평범함'], ['결제만 하고 아직 못 들음']], satisfied: [4, ['경험 / 성장']],
      }),
      rule('경조/선물/후원', '사회/관계', CREDIT, 0.03, ALL, [['친구 생일 선물', 25000, 45000], ['동기 카카오톡 선물', 10000, 22000]], {
        satisfied: [7, ['사회적 유대']], neutral: [3, ['평범함']],
      }),
    ],
    ratedRate: 0.85,
    challenges: [
      { category: '뷰티/미용', periodStart: '2026-09-01', periodEnd: '2026-09-30', expect: 'completed' },
      { category: '패션/쇼핑', periodStart: '2026-10-05', periodEnd: '2026-10-31', expect: 'failed' },
      { category: '식비', periodStart: '2026-11-02', periodEnd: '2026-11-30', expect: 'active' },
      { category: '패션/쇼핑', periodStart: '2026-11-02', periodEnd: '2026-11-30', expect: 'failed' },
    ],
  },
  {
    key: 'yuna',
    account: { nickname: '유나' },
    profile: {
      name: '유나', age: 28, job: '5년 차 영업직',
      income: '월급 340만 원',
      pattern: '회식, 경조사, 선물, 더치페이 지출이 많음',
      goal: '거절 못 하는 소비 줄이기',
      expectedReport: '구매 압박형, 사회/관계 배경 비중이 큼',
    },
    incomes: [income(1, '월급', '월급', 3400000), income('2026-09-22', '기타', '추석 상여금', 500000)],
    fixed: [
      fixed(1, '공과금(주거/세금/통신/보험)', '전세대출 이자', 380000, '필수/생존', '체크카드', r('neutral', ['대안 없음'])),
      fixed(12, '공과금(주거/세금/통신/보험)', '관리비와 공과금', 118000, '필수/생존', '체크카드', r('neutral', ['대안 없음'])),
      fixed(20, '공과금(주거/세금/통신/보험)', '휴대폰 요금과 보험료', 142000, '필수/생존', '신용카드', r('neutral', ['일상적 / 습관적'])),
      fixed(3, '투자/저축', '적금과 펀드 자동이체', 500000, '투자(저축)/미래지향', '체크카드', r('satisfied', ['필요 충족'])),
      fixed(10, '교통/자동차', '교통비와 외근 주유', 118000, '필수/생존', '신용카드', r('neutral', ['대안 없음'])),
      fixed('2026-07-11', '경조/선물/후원', '거래처 대리님 결혼 축의금', 100000, '사회/관계', '현금', r('dissatisfied', ['경제적 / 사회적 압박'], '잘 모르는 분인데 빠질 수가 없었다')),
      fixed('2026-07-17', '술/유흥', '부서 여름 회식 회비', 60000, '사회/관계', '체크카드', r('dissatisfied', ['경제적 / 사회적 압박'])),
      fixed('2026-07-25', '경조/선물/후원', '친한 친구 결혼 축의금', 100000, '사회/관계', '현금', r('satisfied', ['사회적 유대'], '오랜 친구라 기쁜 마음으로 냈다')),
      fixed('2026-08-08', '경조/선물/후원', '대학 선배 결혼 축의금', 100000, '사회/관계', '현금', r('neutral', ['기타'], '연락 끊겼던 선배인데 거절을 못 했다')),
      fixed('2026-08-22', '경조/선물/후원', '거래처 과장님 결혼 축의금', 100000, '사회/관계', '현금', r('dissatisfied', ['경제적 / 사회적 압박'])),
      fixed('2026-08-27', '여행/숙박', '회사 워크숍 개인 부담금', 120000, '사회/관계', '체크카드', r('dissatisfied', ['경제적 / 사회적 압박'], '안 간다고 말할 분위기가 아니었음')),
      fixed('2026-09-12', '경조/선물/후원', '동기 결혼 축의금', 100000, '사회/관계', '현금', r('satisfied', ['사회적 유대'], '진심으로 축하해 주고 싶었던 친구')),
      fixed('2026-09-21', '경조/선물/후원', '거래처 추석 선물 세트', 185000, '사회/관계', '신용카드', r('dissatisfied', ['경제적 / 사회적 압박', '가격 불만'], '다들 돌린다길래 눈치 보여서 샀다')),
      fixed('2026-09-23', '경조/선물/후원', '부모님 추석 용돈', 300000, '사회/관계', '체크카드', r('satisfied', ['사회적 유대', '필요 충족'])),
      fixed('2026-10-10', '경조/선물/후원', '직장 선배 결혼 축의금', 100000, '사회/관계', '현금', r('neutral', ['평범함'])),
      fixed('2026-10-17', '패션/쇼핑', '동창 결혼식 하객룩', 158000, '자기표현/이미지·SNS', '신용카드', r('dissatisfied', ['경제적 / 사회적 압박', '과소비 / 불필요'], '어쩔 수 없이 샀다. 한 번 입고 끝날 듯')),
      fixed('2026-10-23', '경조/선물/후원', '팀장님 승진 선물 공동 부담', 70000, '사회/관계', '체크카드', r('dissatisfied', ['경제적 / 사회적 압박'])),
      fixed('2026-11-01', '경조/선물/후원', '고객사 대리님 결혼 축의금', 100000, '사회/관계', '현금', null),
      fixed('2026-11-04', '경조/선물/후원', '퇴사하는 동료 단체 선물', 45000, '사회/관계', '신용카드', null),
    ],
    rules: [
      rule('술/유흥', '사회/관계', CREDIT, 0.42, [2, 3, 4, 5], [
        ['팀 회식 2차 더치페이', 25000, 42000], ['거래처 미팅 뒤풀이', 35000, 65000], ['동료들이랑 치맥', 22000, 35000],
        ['회식 후 노래방 N빵', 15000, 25000], ['대학 동기 모임 술값', 38000, 55000],
      ], {
        dissatisfied: [5, ['경제적 / 사회적 압박', '과소비 / 불필요'], ['2차는 빠지고 싶었는데 눈치 보여서 결제', '거절을 못 해서 끝까지 있었다']],
        neutral: [3, ['일상적 / 습관적']], satisfied: [2, ['사회적 유대']],
      }),
      rule('식비', '사회/관계', CREDIT, 0.45, WEEKDAYS, [
        ['팀 점심 더치페이', 11000, 16000], ['거래처 점심 내가 계산', 38000, 62000], ['후배들 점심 사줌', 28000, 45000],
      ], {
        neutral: [5, ['일상적 / 습관적', '평범함']], dissatisfied: [3, ['경제적 / 사회적 압박', '가격 불만']], satisfied: [2, ['사회적 유대']],
      }),
      rule('식비', '필수/생존', MIXED, 0.3, ALL, [
        ['혼자 국밥', 9000, 11000], ['퇴근길 김밥', 4500, 7500], ['집밥 재료 장보기', 12000, 25000],
      ], { satisfied: [6, ['가성비 만족', '필요 충족']], neutral: [4, ['평범함']] }),
      rule('카페/간식', '사회/관계', CREDIT, 0.55, WEEKDAYS, [
        ['팀원들 커피 돌림', 14000, 28000], ['거래처 미팅 커피', 9000, 18000], ['혼자 아메리카노', 2500, 4500],
      ], { neutral: [6, ['일상적 / 습관적']], dissatisfied: [2, ['경제적 / 사회적 압박']], satisfied: [2, ['사회적 유대', '감정 충족']] }),
      rule('경조/선물/후원', '사회/관계', CREDIT, 0.11, ALL, [
        ['동료 생일 카카오톡 선물', 15000, 35000], ['부서 경조사 회비', 10000, 20000], ['조의금', 50000, 50000], ['친구 집들이 선물', 28000, 45000],
      ], {
        dissatisfied: [4, ['경제적 / 사회적 압박'], ['안 하면 나만 튈까 봐 부담돼서 샀다', '거절을 못 했다']],
        neutral: [3, ['기타', '평범함'], ['다들 낸다고 해서 어쩔 수 없이 결제함']], satisfied: [3, ['사회적 유대']],
      }),
      rule('패션/쇼핑', '자기표현/이미지·SNS', CREDIT, 0.04, ALL, [
        ['외근용 블라우스', 39000, 69000], ['구두 굽 수선과 스타킹', 12000, 22000],
      ], { neutral: [5, ['대안 없음', '평범함']], satisfied: [3, ['필요 충족']], dissatisfied: [2, ['경제적 / 사회적 압박']] }),
      rule('뷰티/미용', '자기표현/이미지·SNS', CREDIT, 0.04, ALL, [['미용실 뿌리염색', 55000, 75000], ['기초 화장품', 25000, 48000]], {
        neutral: [6, ['평범함']], satisfied: [4, ['필요 충족']],
      }),
      rule('생활(마트 잡화)', '필수/생존', MIXED, 0.08, WEEKEND, [['주말 마트 장보기', 28000, 55000], ['쿠팡 생필품', 15000, 32000]], {
        neutral: [6, ['일상적 / 습관적']], satisfied: [4, ['필요 충족']],
      }),
      rule('문화/여가', '여가', CREDIT, 0.1, WEEKEND, [['혼자 영화', 15000, 16000], ['요가 원데이 클래스', 28000, 35000]], {
        satisfied: [9, ['감정 충족', '경험 / 성장']], neutral: [1, ['평범함']],
      }),
      rule('의료/건강', '필수/생존', CREDIT, 0.03, WEEKDAYS, [['위장약과 숙취해소제', 8000, 18000], ['정형외과 물리치료', 12000, 22000]], {
        neutral: [7, ['대안 없음']], dissatisfied: [3, ['기타'], ['술자리 때문에 또 위가 아픔']],
      }),
    ],
    ratedRate: 0.8,
    challenges: [
      { category: '경조/선물/후원', periodStart: '2026-09-01', periodEnd: '2026-09-30', expect: 'failed' },
      { category: '문화/여가', periodStart: '2026-10-01', periodEnd: '2026-10-31', expect: 'completed' },
      { category: '술/유흥', periodStart: '2026-10-01', periodEnd: '2026-10-31', expect: 'completed' },
      { category: '술/유흥', periodStart: '2026-11-02', periodEnd: '2026-11-30', expect: 'active' },
      { category: '경조/선물/후원', periodStart: '2026-11-01', periodEnd: '2026-11-30', expect: 'failed' },
    ],
  },
  {
    key: 'yerin',
    account: { nickname: '예린' },
    profile: {
      name: '예린', age: 21, job: '덕질하는 대학생',
      income: '월 120만 원 (용돈 50만 + 알바 70만)',
      pattern: '콘서트·굿즈에 크게 쓰고 식비를 줄임',
      goal: '덕질과 생활비의 균형',
      expectedReport: '문화/여가 이상치인데 만족도 높음(양의 상관), 식비 불만족',
    },
    incomes: [income(1, '용돈', '부모님 용돈', 500000), income(5, '기타', '주말 알바 급여', 700000)],
    fixed: [
      fixed(4, '공과금(주거/세금/통신/보험)', '휴대폰 요금', 39000, '필수/생존', '체크카드', r('neutral', ['대안 없음'])),
      fixed(2, '교통/자동차', '교통카드 충전', 55000, '필수/생존', '체크카드', r('neutral', ['일상적 / 습관적'])),
      fixed(14, '문화/여가', '음원 스트리밍 구독', 11900, '여가', '체크카드', r('satisfied', ['감정 충족'])),
      fixed(9, '투자/저축', '다음 콘서트 비상금 저축', 50000, '투자(저축)/미래지향', '체크카드', r('satisfied', ['필요 충족'])),
      fixed('2026-07-07', '문화/여가', '여름 앨범 공구 2장', 52000, '쾌락/감정', '체크카드', r('satisfied', ['감정 충족'])),
      fixed('2026-07-18', '문화/여가', '팝업스토어 한정 굿즈', 74000, '쾌락/감정', '체크카드', r('satisfied', ['감정 충족', '경험 / 성장'], '오픈런 성공, 후회 없음')),
      fixed('2026-07-25', '문화/여가', '여름 음악 페스티벌 티켓', 99000, '여가', '체크카드', r('satisfied', ['경험 / 성장', '감정 충족'])),
      fixed('2026-08-03', '문화/여가', '팬클럽 정기 가입비', 33000, '자기표현/이미지·SNS', '체크카드', r('satisfied', ['감정 충족'])),
      fixed('2026-08-11', '문화/여가', '가을 콘서트 티켓 예매', 165000, '쾌락/감정', '체크카드', r('satisfied', ['감정 충족', '경험 / 성장'], '피켓팅 성공! 후회 없음')),
      fixed('2026-08-29', '문화/여가', '컴백 앨범 공구 3장', 58000, '쾌락/감정', '체크카드', r('satisfied', ['감정 충족'])),
      fixed('2026-09-05', '패션/쇼핑', '콘서트 때 입을 옷', 49000, '자기표현/이미지·SNS', '체크카드', r('satisfied', ['감정 충족'])),
      fixed('2026-09-10', '문화/여가', '콘서트 막콘 티켓 양도', 176000, '쾌락/감정', '체크카드', r('satisfied', ['감정 충족', '경험 / 성장'], '막콘은 못 참지')),
      fixed('2026-09-19', '문화/여가', '콘서트 현장 굿즈 응원봉', 92000, '쾌락/감정', '체크카드', r('satisfied', ['감정 충족', '경험 / 성장'], '평생 쓸 응원봉이라 안 아까움')),
      fixed('2026-09-20', '문화/여가', '콘서트 현장 슬로건과 포토북', 68000, '쾌락/감정', '현금', r('satisfied', ['감정 충족'])),
      fixed('2026-10-06', '문화/여가', '부산 팬콘 티켓 예매', 198000, '쾌락/감정', '체크카드', r('satisfied', ['경험 / 성장', '감정 충족'], '이번 달 식비 줄여야 하지만 만족')),
      fixed('2026-10-24', '교통/자동차', '부산 왕복 KTX', 119600, '쾌락/감정', '체크카드', r('satisfied', ['경험 / 성장'])),
      fixed('2026-10-24', '여행/숙박', '부산 팬콘 게스트하우스', 78000, '쾌락/감정', '체크카드', r('satisfied', ['경험 / 성장', '사회적 유대'], '덕친들이랑 같이 묵어서 재밌었음')),
      fixed('2026-11-02', '문화/여가', '겨울 팬미팅 티켓 예매', 88000, '쾌락/감정', '체크카드', null),
      fixed('2026-11-04', '카페/간식', '덕친들이랑 포카 교환 카페', 6500, '사회/관계', '체크카드', null),
      fixed('2026-11-05', '문화/여가', '시즌그리팅 예약 구매', 45000, '쾌락/감정', '체크카드', null),
    ],
    rules: [
      rule('식비', '필수/생존', CHECK, 0.72, WEEKDAYS, [
        ['편의점 삼각김밥으로 때움', 2400, 4500], ['학식', 5000, 6000], ['컵라면이랑 김밥', 4000, 5500], ['학교 앞 천원 아침밥', 1000, 1000], ['편의점 도시락', 4500, 5500],
      ], {
        dissatisfied: [7, ['품질 불만', '기타'], ['덕질 비용 때문에 또 편의점', '밥을 너무 대충 먹었다', '건강 생각하면 이러면 안 되는데']],
        neutral: [4, ['대안 없음', '일상적 / 습관적']], satisfied: [1, ['가성비 만족']],
      }, { from: '2026-09-01' }),
      rule('식비', '필수/생존', CHECK, 0.45, ALL, [
        ['알바 전 편의점 끼니', 3000, 6000], ['혼밥 분식', 5500, 8000],
      ], {
        dissatisfied: [6, ['품질 불만', '기타']], neutral: [3, ['대안 없음', '평범함']], satisfied: [1, ['가성비 만족']],
      }),
      rule('식비', '사회/관계', CHECK, 0.2, WEEKEND, [['덕친들이랑 생일카페 후 밥', 13000, 19000], ['과 친구들이랑 저녁', 12000, 17000]], {
        satisfied: [8, ['사회적 유대']], neutral: [2, ['평범함']],
      }),
      rule('카페/간식', '사회/관계', CHECK, 0.2, ALL, [
        ['아이돌 생일카페 음료', 6500, 7500], ['덕친들이랑 포카 교환 카페', 5500, 8000], ['과제하며 아메리카노', 2000, 3500],
      ], { satisfied: [7, ['사회적 유대', '감정 충족']], neutral: [3, ['평범함']] }),
      rule('문화/여가', '쾌락/감정', CHECK, 0.32, ALL, [
        ['포토카드 양도', 5000, 18000], ['멤버 인형 공구', 18000, 28000], ['스트리밍 이용권', 7900, 7900], ['포카 바인더와 탑로더', 6000, 12000], ['시즌 굿즈 키링', 9000, 15000],
      ], {
        satisfied: [7, ['감정 충족']], neutral: [2, ['평범함']], dissatisfied: [1, ['과소비 / 불필요'], ['같은 포카를 또 샀다']],
      }),
      rule('생활(마트 잡화)', '필수/생존', CHECK, 0.08, ALL, [['다이소 생활용품', 3000, 7000], ['올리브영 세면용품', 8000, 14000]], {
        neutral: [6, ['평범함']], satisfied: [4, ['필요 충족']],
      }),
      rule('뷰티/미용', '자기표현/이미지·SNS', CHECK, 0.04, ALL, [['콘서트용 글리터', 7000, 12000], ['셀프 네일 스티커', 8000, 13000]], {
        satisfied: [7, ['감정 충족']], neutral: [3, ['평범함']],
      }),
      rule('교통/자동차', '여가', CHECK, 0.03, WEEKEND, [['공방 갔다 오는 택시', 9000, 15000]], {
        neutral: [6, ['대안 없음']], satisfied: [4, ['필요 충족']],
      }),
      rule('교육', '자아실현/자기계발', CHECK, 0.012, WEEKDAYS, [['전공 교재', 15000, 25000]], {
        neutral: [6, ['대안 없음']], satisfied: [4, ['필요 충족']],
      }),
      rule('경조/선물/후원', '사회/관계', CHECK, 0.03, ALL, [['덕친 생일 선물', 10000, 20000], ['아이돌 생일 광고 모금', 10000, 30000]], {
        satisfied: [9, ['사회적 유대', '감정 충족']], neutral: [1, ['평범함']],
      }),
    ],
    ratedRate: 0.9,
    challenges: [
      { category: '카페/간식', periodStart: '2026-09-01', periodEnd: '2026-09-30', expect: 'completed' },
      { category: '문화/여가', periodStart: '2026-10-01', periodEnd: '2026-10-31', expect: 'failed' },
      { category: '카페/간식', periodStart: '2026-11-02', periodEnd: '2026-11-30', expect: 'active' },
      { category: '문화/여가', periodStart: '2026-11-02', periodEnd: '2026-11-30', expect: 'failed' },
    ],
  },
];

// ── 생성 ──
function timestampOn(rng, ymd) {
  // 오늘 데이터가 미래 시각이 되지 않도록 09~17시로 둔다.
  const hour = 9 + Math.floor(rng() * 9);
  const min = Math.floor(rng() * 60);
  return `${ymd}T${pad(hour)}:${pad(min)}:00+09:00`;
}

function eachDate(start, end, fn) {
  for (let d = start; d <= end; d = addDays(d, 1)) fn(d);
}

function occursOn(when, ymd) {
  return typeof when === 'number' ? Number(ymd.slice(8)) === when : when === ymd;
}

function makeRating(rng, ymd, emotion, reasons, memo) {
  const ratedOn = addDays(ymd, Math.floor(rng() * 3));
  return {
    emotion,
    reasons,
    memo,
    createdAt: timestampOn(rng, ratedOn > END ? END : ratedOn),
  };
}

function ruleRating(rng, persona, item, ymd) {
  const emotion = weighted(rng, Object.entries(item.rate).map(([e, spec]) => [e, spec[0]]));
  const [, reasonPool, notes] = item.rate[emotion];
  const reasons = [pick(rng, reasonPool)];
  if (reasonPool.length > 1 && rng() < 0.3) {
    const other = pick(rng, reasonPool);
    if (!reasons.includes(other)) reasons.push(other);
  }
  const memo = notes && rng() < 0.45 ? pick(rng, notes) : '';
  return makeRating(rng, ymd, emotion, reasons, memo);
}

const roundPrice = (rng, min, max) => {
  if (min === max) return min;
  return Math.round((min + rng() * (max - min)) / 100) * 100;
};

function generate(persona, start = START, end = END, rngKey = persona.key) {
  const rng = makeRng(rngKey);
  const list = [];
  const recentFrom = addDays(END, -UNRATED_RECENT_DAYS + 1);

  eachDate(start, end, (ymd) => {
    for (const inc of persona.incomes) {
      if (!occursOn(inc.when, ymd)) continue;
      list.push({
        type: 'income', amount: inc.amount, category: '수입', memo: inc.memo, date: ymd,
        incomeSource: inc.source, createdAt: timestampOn(rng, ymd),
      });
    }

    for (const f of persona.fixed) {
      if (!occursOn(f.when, ymd)) continue;
      const rating = f.rating && ymd < recentFrom
        ? makeRating(rng, ymd, f.rating.emotion, f.rating.reasons, f.rating.memo)
        : undefined;
      list.push({
        type: 'expense', amount: f.amount, category: f.category, memo: f.memo, date: ymd,
        paymentMethod: f.paymentMethod, spendingBackground: f.spendingBackground,
        createdAt: timestampOn(rng, ymd), rating,
      });
    }

    for (const item of persona.rules) {
      if (item.from && ymd < item.from) continue;
      if (!item.days.includes(weekday(ymd))) continue;
      if (rng() >= item.p) continue;

      const [memo, min, max] = pick(rng, item.items);
      const rated = ymd < recentFrom && rng() < persona.ratedRate;
      list.push({
        type: 'expense', amount: roundPrice(rng, min, max), category: item.category, memo, date: ymd,
        paymentMethod: weighted(rng, item.pay),
        spendingBackground: item.spendingBackground,
        createdAt: timestampOn(rng, ymd),
        rating: rated ? ruleRating(rng, persona, item, ymd) : undefined,
      });
    }
  });

  return list.sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
}

// ── 챌린지: 실제 지출 합계에서 목표 금액을 정한다 ──
const MAN = 10000;
function targetFor(spent, expect) {
  if (expect === 'failed') return Math.max(MAN, Math.floor((spent * 0.8) / MAN) * MAN);
  if (expect === 'completed') return Math.ceil((spent * 1.1) / MAN) * MAN;
  return Math.ceil((spent * 2.5) / MAN) * MAN; // active: 아직 여유가 있는 진행률
}

function deriveStatus(spent, target, periodEnd) {
  if (spent > target) return 'failed';
  return END > periodEnd ? 'completed' : 'active';
}

function buildChallenges(persona, transactions) {
  return persona.challenges.map((c) => {
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.category === c.category
        && t.date >= c.periodStart && t.date <= c.periodEnd)
      .reduce((sum, t) => sum + t.amount, 0);
    const targetAmount = targetFor(spent, c.expect);
    const status = deriveStatus(spent, targetAmount, c.periodEnd);
    if (spent === 0 || status !== c.expect) {
      throw new Error(`${persona.key} ${c.category} ${c.periodStart}: 기대 ${c.expect}, 실제 ${status}, 지출 ${spent}`);
    }
    return {
      category: c.category,
      targetAmount,
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      createdAt: `${c.periodStart}T09:00:00+09:00`,
      expectedStatus: c.expect,
    };
  });
}

function validate(persona, transactions) {
  for (const t of transactions) {
    if (!t.memo.trim() || !t.amount || t.date > END || t.date < FIRST_DATE) {
      throw new Error(`${persona.key}: 잘못된 거래 ${JSON.stringify(t)}`);
    }
    if (!t.rating) continue;
    if (t.rating.reasons.length === 0 || t.rating.reasons.some((x) => !REASONS[t.rating.emotion].includes(x))) {
      throw new Error(`${persona.key}: 앱에 없는 사유 ${JSON.stringify(t.rating)}`);
    }
  }
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const persona of PERSONAS) {
    const added = ADDED_MONTHS.flatMap(({ start, end }) =>
      generate(persona, start, end, `${persona.key}:${start}`)
    );
    const transactions = [...added, ...generate(persona)];
    validate(persona, transactions);
    const output = {
      account: {
        legacyUid: `persona_${persona.key}`,
        username: `${persona.key}id`,
        nickname: persona.account.nickname,
        email: `${persona.key}@persona.savemate.test`,
      },
      profile: persona.profile,
      transactions,
      challenges: buildChallenges(persona, transactions),
    };
    fs.writeFileSync(path.join(OUT_DIR, `${persona.key}.json`), `${JSON.stringify(output, null, 2)}\n`);
    console.log(`[generate] ${persona.key}: 거래 ${transactions.length}건`);
  }
}

main();
