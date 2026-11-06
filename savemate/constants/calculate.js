// constants/calculate.js
// 금액 입력 계산기(TransactionInput)에서 쓰는 수식 계산. 단위 테스트(__tests__/calculate.test.js)가 이 파일을 직접 불러온다.
// Node 에서 별도 설정 없이 테스트하려고 CommonJS(module.exports)로 작성했다. 앱에서는 import 로 그대로 쓸 수 있다.

// 사칙연산 수식(숫자, 소수점, + - * /)을 계산한다. eval 을 쓰지 않는다.
// 기존 eval 과 같은 결과가 나오도록 만들었다. (곱셈/나눗셈 우선, 왼쪽부터 계산)
//  - 계산 결과가 문자열로 되돌아와 다시 수식에 들어가므로 1e-7, Infinity, NaN 도 숫자로 읽는다.
//  - 앞자리가 0인 정수는 eval(느슨 모드)과 똑같이 읽는다. 0~7 로만 된 수는 8진수(010 = 8), 8/9 가 섞이면 10진수.
//  - '--', '++' 처럼 부호가 연달아 오거나 잘못된 수식은 에러를 던진다.
const OPERATORS = ['+', '-', '*', '/'];
const toNumber = (token) => {
  if (token === 'Infinity') return Infinity;
  if (token === 'NaN') return NaN;
  const intPart = token.match(/^\d*/)[0];
  if (intPart.length > 1 && intPart[0] === '0' && /^[0-7]+$/.test(intPart)) {
    if (token !== intPart) throw new Error('invalid expression'); // 01.5 같은 수는 eval 에서도 문법 오류
    return parseInt(intPart, 8);
  }
  return Number(token);
};

const calculate = (expression) => {
  const text = String(expression).replace(/\s+/g, '');
  const tokens =
    text.match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?|Infinity|NaN|[+\-*/]/g) || [];
  if (tokens.length === 0 || tokens.join('') !== text) throw new Error('invalid expression');
  for (let i = 0; i < tokens.length - 1; i++) {
    if ((tokens[i] === '+' || tokens[i] === '-') && tokens[i] === tokens[i + 1]) {
      throw new Error('invalid expression');
    }
  }

  let pos = 0;
  const factor = () => {
    const token = tokens[pos++];
    if (token === '-') return -factor();
    if (token === '+') return factor();
    if (token === undefined || OPERATORS.includes(token)) throw new Error('invalid expression');
    return toNumber(token);
  };
  const term = () => {
    let value = factor();
    while (tokens[pos] === '*' || tokens[pos] === '/') {
      const op = tokens[pos++];
      const right = factor();
      value = op === '*' ? value * right : value / right;
    }
    return value;
  };
  const sum = () => {
    let value = term();
    while (tokens[pos] === '+' || tokens[pos] === '-') {
      const op = tokens[pos++];
      const right = term();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  };

  const result = sum();
  if (pos !== tokens.length) throw new Error('invalid expression');
  return result;
};

module.exports = { calculate };
