// constants/calculate.js
// 금액 입력 계산기(TransactionInput)에서 쓰는 수식 계산. 단위 테스트(__tests__/calculate.test.js)가 이 파일을 직접 불러온다.
// Node 에서 별도 설정 없이 테스트하려고 CommonJS(module.exports)로 작성했다. 앱에서는 import 로 그대로 쓸 수 있다.

// 사칙연산 수식(숫자, 소수점, + - * /)을 계산한다. eval 을 쓰지 않는다. (곱셈/나눗셈 우선, 왼쪽부터 계산)
//  - 이전에 eval 로 계산하던 때와 결과가 같지만, 아래 두 가지는 버그라서 일부러 다르게 처리한다.
//    1) 앞자리가 0인 수는 10진수로 읽는다. (eval 은 0~7 로만 된 수를 8진수로 읽어 0100 이 64 가 됐다)
//    2) 0으로 나누는 등 유한하지 않은 결과는 에러다. (eval 은 Infinity 를 돌려줘 금액이 Infinity 로 저장되려 했다)
//  - 계산 결과가 문자열로 되돌아와 다시 수식에 들어가므로, 1e-7 같은 지수 표기도 숫자로 읽는다.
//  - '--', '++' 처럼 부호가 연달아 오거나 잘못된 수식은 에러를 던진다.
const OPERATORS = ['+', '-', '*', '/'];

const calculate = (expression) => {
  const text = String(expression).replace(/\s+/g, '');
  const tokens = text.match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?|[+\-*/]/g) || [];
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
    return Number(token);
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
  if (pos !== tokens.length || !Number.isFinite(result)) throw new Error('invalid expression');
  return result;
};

module.exports = { calculate };
