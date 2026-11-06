// analytics/financeAnalytics.js 테스트: 리포트에 쓰이는 수치 계산
// (수치는 서버 코드가 계산하고 Gemini 는 설명만 하므로, 이 계산이 틀리면 리포트가 틀린다)
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeFinances, REPORT_VERSION } = require('../analytics/financeAnalytics');

const expense = (id, amount, category = '식비', extra = {}) => ({
  id, type: 'expense', amount, category, date: '2026-11-01', memo: '', ...extra,
});
const rating = (transactionId, emotion, reasons = [], memo = '') => ({
  transactionId, emotion, reasons, memo,
});

test('입력이 없어도 빈 결과를 돌려준다', () => {
  const result = analyzeFinances();
  assert.equal(result.version, REPORT_VERSION);
  assert.equal(result.satisfactionCorrelation.coefficient, null);
  assert.equal(result.satisfactionCorrelation.sufficient, false);
  assert.deepEqual(result.categoryEfficiency, []);
  assert.deepEqual(result.outliers, []);
  assert.deepEqual(result.reflectiveSpending, []);
});

test('수입, 0원, 숫자가 아닌 금액은 지출 분석에서 제외한다', () => {
  const transactions = [
    { id: 'i1', type: 'income', amount: 5000, category: '월급' },
    expense('e0', 0),
    expense('ex', 'abc'),
    expense('e1', 3000),
  ];
  const ratings = ['i1', 'e0', 'ex', 'e1'].map((id) => rating(id, 'satisfied'));
  const result = analyzeFinances(transactions, ratings);
  assert.equal(result.satisfactionCorrelation.sampleSize, 1);
  assert.equal(result.categoryEfficiency[0].ratedCount, 1);
});

test('모르는 감정 값의 평가는 무시한다', () => {
  const result = analyzeFinances([expense('e1', 1000)], [rating('e1', 'happy')]);
  assert.equal(result.satisfactionCorrelation.sampleSize, 0);
});

test('금액이 클수록 만족도가 낮으면 상관계수 -1 (강한 음의 상관)', () => {
  const transactions = [expense('a', 10000), expense('b', 20000), expense('c', 30000)];
  const ratings = [rating('a', 'satisfied'), rating('b', 'neutral'), rating('c', 'dissatisfied')];
  const { satisfactionCorrelation: c } = analyzeFinances(transactions, ratings);
  assert.equal(c.coefficient, -1);
  assert.equal(c.strength, 'strong');
  assert.equal(c.direction, 'negative');
  assert.equal(c.sampleSize, 3);
  assert.equal(c.sufficient, true);
});

test('금액이 클수록 만족도가 높으면 상관계수 +1 (강한 양의 상관)', () => {
  const transactions = [expense('a', 10000), expense('b', 20000), expense('c', 30000)];
  const ratings = [rating('a', 'dissatisfied'), rating('b', 'neutral'), rating('c', 'satisfied')];
  const { satisfactionCorrelation: c } = analyzeFinances(transactions, ratings);
  assert.equal(c.coefficient, 1);
  assert.equal(c.direction, 'positive');
});

test('평가가 3건 미만이면 상관관계를 계산하지 않는다', () => {
  const transactions = [expense('a', 10000), expense('b', 20000)];
  const ratings = [rating('a', 'satisfied'), rating('b', 'dissatisfied')];
  const { satisfactionCorrelation: c } = analyzeFinances(transactions, ratings);
  assert.equal(c.coefficient, null);
  assert.equal(c.strength, 'insufficient_data');
  assert.equal(c.direction, null);
  assert.equal(c.sufficient, false);
  assert.equal(c.sampleSize, 2);
});

test('카테고리별 만족 효율: 평균 금액, 평균 만족도, 1만원당 만족도', () => {
  const transactions = [expense('a', 10000, '카페'), expense('b', 30000, '카페')];
  const ratings = [rating('a', 'satisfied'), rating('b', 'dissatisfied')];
  const [cafe] = analyzeFinances(transactions, ratings).categoryEfficiency;
  assert.equal(cafe.category, '카페');
  assert.equal(cafe.ratedCount, 2);
  assert.equal(cafe.totalAmount, 40000);
  assert.equal(cafe.averageAmount, 20000);
  assert.equal(cafe.averageSatisfaction, 3);
  assert.equal(cafe.satisfactionPer10000Won, 1.5); // 평균 만족도 3 / 평균 금액 2만원 x 1만원
});

test('1만원당 만족도는 만족도 척도의 최대값 5점을 넘지 않고, 높은 순으로 정렬한다', () => {
  const transactions = [expense('a', 10000, '카페'), expense('b', 30000, '카페'), expense('c', 1000, '간식')];
  const ratings = [rating('a', 'satisfied'), rating('b', 'dissatisfied'), rating('c', 'satisfied')];
  const rows = analyzeFinances(transactions, ratings).categoryEfficiency;
  assert.deepEqual(rows.map((r) => r.category), ['간식', '카페']);
  assert.equal(rows[0].satisfactionPer10000Won, 5); // 5점 / 1천원 x 1만원 = 50 이지만 5로 제한
});

test('이상치: 같은 카테고리 지출 4건 이상일 때 IQR 상한을 넘는 지출만 잡는다', () => {
  const transactions = [
    expense('o1', 1000), expense('o2', 1000), expense('o3', 1000), expense('o4', 1000),
    expense('o5', 10000, '식비', { memo: '회식' }),
  ];
  const { outliers } = analyzeFinances(transactions, []);
  assert.equal(outliers.length, 1);
  assert.equal(outliers[0].transactionId, 'o5');
  assert.equal(outliers[0].medianAmount, 1000);
  assert.equal(outliers[0].thresholdAmount, 1000);
  assert.equal(outliers[0].medianRatio, 10);
  assert.equal(outliers[0].memo, '회식');
});

test('이상치: 상한은 Q3 + 1.5 x IQR 이다 (사분위 범위가 0이 아닌 경우)', () => {
  // 정렬: 1000 2000 3000 4000 5000 12000 -> Q1 = 2250, Q3 = 4750, IQR = 2500, 상한 = 4750 + 3750 = 8500
  const amounts = [1000, 2000, 3000, 4000, 5000, 12000];
  const transactions = amounts.map((amount, i) => expense(`m${i}`, amount));
  const { outliers } = analyzeFinances(transactions, []);
  assert.deepEqual(outliers.map((o) => o.transactionId), ['m5']); // 5000 은 상한 이하
  assert.equal(outliers[0].thresholdAmount, 8500);
  assert.equal(outliers[0].medianAmount, 3500);
  assert.equal(outliers[0].medianRatio, 3.43);
});

test('이상치: 지출이 4건 미만이면 판단하지 않는다', () => {
  const transactions = [expense('o1', 1000), expense('o2', 1000), expense('o3', 100000)];
  assert.deepEqual(analyzeFinances(transactions, []).outliers, []);
});

test('되돌아볼 소비: 사유 버튼으로 분류한다', () => {
  const transactions = [expense('a', 5000)];
  const ratings = [rating('a', 'dissatisfied', ['과소비 / 불필요'])];
  const [item] = analyzeFinances(transactions, ratings).reflectiveSpending;
  assert.equal(item.typeKey, 'unnecessary');
  assert.equal(item.evidence, '사유: 과소비 / 불필요');
  assert.equal(item.amount, 5000);
});

test('되돌아볼 소비: 만족한 지출은 포함하지 않는다', () => {
  const transactions = [expense('a', 5000)];
  const ratings = [rating('a', 'satisfied', ['과소비 / 불필요'])];
  assert.deepEqual(analyzeFinances(transactions, ratings).reflectiveSpending, []);
});

test('되돌아볼 소비: 사유가 없으면 명확한 메모 표현으로 분류한다', () => {
  const transactions = [expense('a', 5000)];
  const ratings = [rating('a', 'neutral', [], '괜히 샀어')];
  const [item] = analyzeFinances(transactions, ratings).reflectiveSpending;
  assert.equal(item.typeKey, 'unnecessary');
  assert.equal(item.evidence, '명확한 메모 표현');
});

test('되돌아볼 소비: "후회하지 않아" 같은 부정 표현은 제외한다', () => {
  const transactions = [expense('a', 5000)];
  const ratings = [rating('a', 'neutral', [], '괜히 샀지만 후회하지 않아')];
  assert.deepEqual(analyzeFinances(transactions, ratings).reflectiveSpending, []);
});

test('되돌아볼 소비: 사유 버튼이 메모 표현보다 우선한다', () => {
  const transactions = [expense('a', 5000)];
  const ratings = [rating('a', 'dissatisfied', ['감정 후회'], '괜히 샀어')];
  const [item] = analyzeFinances(transactions, ratings).reflectiveSpending;
  assert.equal(item.typeKey, 'emotional');
});
