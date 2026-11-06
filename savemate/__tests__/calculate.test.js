// 금액 입력 계산기(constants/calculate.js) 테스트
// 실행: npm test   (Node 내장 test runner 사용, 별도 패키지 설치 없음)
//
// 기대값은 계산기를 eval 에서 직접 만든 함수로 바꾸기 전, 옛 eval 로 실제 계산한 결과를 그대로 옮긴 것이다.
// 이 표가 통과하면 교체 전과 같은 값을 낸다는 뜻이므로, calculate 를 고칠 때는 이 표를 먼저 확인한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate } = require('../constants/calculate');

// [수식, 옛 eval 의 결과]
const SAME_AS_EVAL = [
  // 기본 사칙연산과 우선순위, 왼쪽부터 계산
  ['1+2', 3],
  ['2+3*4', 14],
  ['10-2-3', 5],
  ['10/4', 2.5],
  ['2*3+4*5', 26],
  ['100-30/5', 94],
  ['1000*1000', 1000000],
  // 부호. 계산 결과가 음수일 때 '-4+' 처럼 수식 앞에 부호가 붙는다
  ['-4+2', -2],
  ['5*-3', -15],
  ['5/-2', -2.5],
  ['5+-3', 2],
  ['7-+2', 5],
  // 소수점
  ['0.1+0.2', 0.30000000000000004],
  ['.5', 0.5],
  ['5.', 5],
  ['.5+.5', 1],
  ['1.5*2', 3],
  ['10/3', 3.3333333333333335],
  // 앞자리가 0인 수. eval 은 0~7 로만 된 수를 8진수로 읽는다 (옛 동작을 그대로 유지)
  ['0', 0],
  ['00', 0],
  ['000', 0],
  ['07', 7],
  ['08', 8],
  ['09', 9],
  ['010', 8],
  ['0100', 64],
  ['0777', 511],
  ['0128', 128],
  ['08.5', 8.5],
  // 0으로 나누기, NaN. 계산 결과가 문자열이 되어 다시 수식에 들어가므로 이런 값도 읽을 수 있어야 한다
  ['5/0', Infinity],
  ['-5/0', -Infinity],
  ['0/0', NaN],
  ['Infinity-Infinity', NaN],
  ['Infinity', Infinity],
  ['NaN+1', NaN],
  // 지수 표기 (아주 작거나 큰 계산 결과가 문자열로 돌아온 경우)
  ['1e-7', 1e-7],
  ['1e-7+3', 3.0000001],
  ['1e+21', 1e21],
  ['1e+21+1', 1e21],
  ['2e3*2', 4000],
  // 큰 수
  ['12345678901234567890', 12345678901234567000],
  ['999999999999*999999999999', 9.99999999998e23],
];

for (const [expression, expected] of SAME_AS_EVAL) {
  test(`옛 eval 과 같은 값: ${JSON.stringify(expression)} = ${expected}`, () => {
    assert.deepStrictEqual(calculate(expression), expected);
  });
}

// 옛 eval 도 문법 오류로 거부하던 수식. 호출하는 쪽이 catch 해서 입력한 그대로 보여 준다
const INVALID = [
  '01.5', '00.5', '1.2.3', '5..', '.', '5-', '5+', '*5', '/5', '5*/3', '5--3', '5++3', '++5', '--5',
];

for (const expression of INVALID) {
  test(`잘못된 수식은 에러: ${JSON.stringify(expression)}`, () => {
    assert.throws(() => calculate(expression));
  });
}

test('빈 수식은 에러 (옛 eval 은 undefined 를 돌려줬고, 호출부는 어느 쪽이든 입력을 그대로 보여 준다)', () => {
  assert.throws(() => calculate(''));
});

test('eval 을 쓰지 않으므로 코드를 실행하지 못한다', () => {
  assert.throws(() => calculate('process.exit(1)'));
  assert.throws(() => calculate('1+(2)'));
  assert.throws(() => calculate('alert(1)'));
});
