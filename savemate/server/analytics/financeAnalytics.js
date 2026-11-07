// 리포트 구조나 프롬프트가 바뀌면 값을 올린다. 다른 버전의 캐시는 사용하지 않는다.
const REPORT_VERSION = 'v15-efficiency-threshold';
const EFFICIENCY_BEST_THRESHOLD = 2.5;

const EMOTION_SCORE = {
  dissatisfied: 1,
  neutral: 3,
  satisfied: 5,
};

const REFLECTIVE_SPENDING_RULES = [
  {
    key: 'unnecessary',
    label: '불필요 및 과소비형',
    reason: '과소비 / 불필요',
    message: '그때 정말 필요한 소비였을까요?',
    memoPatterns: [/괜히.{0,8}(샀|구매|결제)/, /필요 없(는데|지만|어서)/, /불필요(했|한|하게)/, /과소비(했|한|했다)/],
  },
  {
    key: 'emotional',
    label: '감정적 소비형',
    reason: '감정 후회',
    message: '기분을 위한 소비, 지금도 만족스럽나요?',
    memoPatterns: [/(사고|사서|구매하고|결제하고).{0,12}후회/, /스트레스.{0,12}(때문|받아서).{0,18}(샀|구매|결제)/, /기분.{0,10}(풀려고|전환하려고).{0,18}(샀|구매|결제)/, /보상 심리.{0,12}(샀|구매|결제)/],
  },
  {
    key: 'pressure',
    label: '구매 압박형',
    reason: '경제적 / 사회적 압박',
    message: '내 마음보다 남의 눈치를 더 봤던 소비였네요.',
    memoPatterns: [/눈치.{0,10}(보여|봐서).{0,18}(샀|구매|결제)/, /억지로.{0,18}(샀|구매|결제)/, /거절(하지|을) 못/, /부담(됐|되었|스러웠).{0,18}(샀|구매|결제)/, /강요받/, /어쩔 수 없이.{0,18}(샀|구매|결제)/],
  },
];

const NEGATED_MEMO_PATTERNS = [
  /후회(하지|하진) 않/, /후회 안/, /억지로 산 (건|것은) 아니/,
  /억지로 사지 않/, /필요 없는 (건|것은) 아니/, /불필요하지 않/,
  /과소비(가|는) 아니/, /강요받지 않/, /부담(되지|스럽지) 않/,
];

const round = (value, digits = 2) => {
  const unit = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * unit) / unit;
};

const mean = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const quantile = (sortedValues, q) => {
  if (!sortedValues.length) return null;
  const position = (sortedValues.length - 1) * q;
  const lower = Math.floor(position);
  const rest = position - lower;
  const upper = sortedValues[lower + 1];
  return upper === undefined
    ? sortedValues[lower]
    : sortedValues[lower] + rest * (upper - sortedValues[lower]);
};

const pearson = (pairs) => {
  if (pairs.length < 3) return null;
  const xs = pairs.map((pair) => pair.amount);
  const ys = pairs.map((pair) => pair.satisfactionScore);
  const xMean = mean(xs);
  const yMean = mean(ys);
  const numerator = pairs.reduce(
    (sum, pair) => sum + (pair.amount - xMean) * (pair.satisfactionScore - yMean),
    0
  );
  const xVariance = xs.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
  const yVariance = ys.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
  const denominator = Math.sqrt(xVariance * yVariance);
  return denominator ? round(numerator / denominator, 3) : null;
};

const correlationLabel = (coefficient) => {
  if (coefficient === null) return 'insufficient_data';
  const strength = Math.abs(coefficient);
  if (strength < 0.2) return 'very_weak';
  if (strength < 0.4) return 'weak';
  if (strength < 0.7) return 'moderate';
  return 'strong';
};

function analyzeFinances(transactions = [], satisfactionRecords = []) {
  const expenses = transactions.filter(
    (transaction) =>
      String(transaction.type || '').toLowerCase() === 'expense' &&
      Number.isFinite(Number(transaction.amount)) &&
      Number(transaction.amount) > 0
  );

  const satisfactionByTransaction = new Map();
  for (const record of satisfactionRecords) {
    const transactionId = String(record.transactionId || '').trim();
    const score = EMOTION_SCORE[String(record.emotion || '').toLowerCase()];
    if (transactionId && score) satisfactionByTransaction.set(transactionId, { ...record, score });
  }

  const ratedExpenses = expenses.flatMap((transaction) => {
    const satisfaction = satisfactionByTransaction.get(String(transaction.id));
    return satisfaction
      ? [{
          transactionId: String(transaction.id),
          category: transaction.category || transaction.spendingCategory || '기타',
          amount: Number(transaction.amount),
          satisfactionScore: satisfaction.score,
          date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date || null,
          memo: transaction.memo || '',
          paymentMethod: transaction.paymentMethod || null,
          spendingBackground: transaction.spendingBackground || null,
          emotion: satisfaction.emotion,
          reasons: Array.isArray(satisfaction.reasons) ? satisfaction.reasons : [],
        }]
      : [];
  });

  const reflectiveSpending = [];
  for (const transaction of expenses) {
    const satisfaction = satisfactionByTransaction.get(String(transaction.id));
    if (!satisfaction) continue;
    const emotion = String(satisfaction.emotion || '').toLowerCase();
    if (emotion !== 'neutral' && emotion !== 'dissatisfied') continue;

    const category = transaction.category || transaction.spendingCategory || '기타';
    const reasons = Array.isArray(satisfaction.reasons) ? satisfaction.reasons : [];
    const memo = [
      satisfaction.memo || '',
      transaction.memo || '',
    ].join(' ').trim();

    // 사유 버튼을 우선하고, 버튼으로 판정되지 않을 때만 명확한 메모 문장을 검사한다.
    let rule = REFLECTIVE_SPENDING_RULES.find((candidate) => reasons.includes(candidate.reason));
    let evidence = rule ? `사유: ${rule.reason}` : null;

    if (!rule && memo && !NEGATED_MEMO_PATTERNS.some((pattern) => pattern.test(memo))) {
      rule = REFLECTIVE_SPENDING_RULES.find((candidate) =>
        candidate.memoPatterns.some((pattern) => pattern.test(memo))
      );
      if (rule) evidence = '명확한 메모 표현';
    }

    if (!rule) continue;
    reflectiveSpending.push({
      transactionId: String(transaction.id),
      typeKey: rule.key,
      typeLabel: rule.label,
      characterMessage: rule.message,
      evidence,
      category,
      amount: Number(transaction.amount || 0),
      date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date || null,
      memo: transaction.memo || satisfaction.memo || '',
      paymentMethod: transaction.paymentMethod || null,
      spendingBackground: transaction.spendingBackground || null,
      emotion,
      reasons,
    });
  }

  const coefficient = pearson(ratedExpenses);
  const categoryGroups = new Map();
  for (const item of ratedExpenses) {
    if (!categoryGroups.has(item.category)) categoryGroups.set(item.category, []);
    categoryGroups.get(item.category).push(item);
  }

  const categoryEfficiency = Array.from(categoryGroups, ([category, records]) => {
    const averageAmount = mean(records.map((record) => record.amount));
    const averageSatisfaction = mean(records.map((record) => record.satisfactionScore));
    const satisfactionPer10000Won = round(
      Math.min(5, (averageSatisfaction / averageAmount) * 10000),
      1
    );
    return {
      category,
      ratedCount: records.length,
      totalAmount: records.reduce((sum, record) => sum + record.amount, 0),
      averageAmount: Math.round(averageAmount),
      averageSatisfaction: round(averageSatisfaction),
      transactions: records,
      // 1만원 예산으로 얻는 만족 효율. 만족도 척도와 동일하게 최대 5점으로 제한한다.
      satisfactionPer10000Won,
      efficiencyGroup: satisfactionPer10000Won >= EFFICIENCY_BEST_THRESHOLD ? 'best' : 'worst',
    };
  }).sort((a, b) => b.satisfactionPer10000Won - a.satisfactionPer10000Won);

  const expenseGroups = new Map();
  for (const transaction of expenses) {
    const category = transaction.category || transaction.spendingCategory || '기타';
    if (!expenseGroups.has(category)) expenseGroups.set(category, []);
    expenseGroups.get(category).push(transaction);
  }

  const outliers = [];
  for (const [category, records] of expenseGroups) {
    if (records.length < 4) continue;
    const amounts = records.map((record) => Number(record.amount)).sort((a, b) => a - b);
    const q1 = quantile(amounts, 0.25);
    const q3 = quantile(amounts, 0.75);
    const median = quantile(amounts, 0.5);
    const threshold = q3 + 1.5 * (q3 - q1);

    for (const transaction of records) {
      const amount = Number(transaction.amount);
      if (amount <= threshold) continue;
      outliers.push({
        transactionId: String(transaction.id),
        category,
        amount,
        medianAmount: Math.round(median),
        thresholdAmount: Math.round(threshold),
        medianRatio: median > 0 ? round(amount / median) : null,
        memo: String(transaction.memo || '').slice(0, 80),
        date: transaction.date instanceof Date
          ? transaction.date.toISOString()
          : transaction.date || null,
        spendingBackground:
          transaction.spendingBackground ||
          transaction.expenseDetail?.spendingBackground ||
          null,
        paymentMethod:
          transaction.paymentMethod ||
          transaction.expenseDetail?.paymentMethod ||
          null,
      });
    }
  }
  outliers.sort((a, b) => b.amount - a.amount);

  return {
    version: REPORT_VERSION,
    methodology: {
      satisfactionScale: 'dissatisfied=1, neutral=3, satisfied=5 (maximum 5)',
      categoryEfficiency: 'Satisfaction points per 10,000 KRW, capped at 5; best >= 2.5, worst < 2.5',
      correlation: 'Pearson correlation; requires at least 3 rated expenses',
      outlier: 'Per-category IQR upper fence (Q3 + 1.5*IQR); requires at least 4 expenses',
    },
    satisfactionCorrelation: {
      coefficient,
      strength: correlationLabel(coefficient),
      direction: coefficient === null ? null : coefficient > 0 ? 'positive' : coefficient < 0 ? 'negative' : 'none',
      sampleSize: ratedExpenses.length,
      sufficient: coefficient !== null,
    },
    categoryEfficiency,
    outliers,
    reflectiveSpending,
  };
}

module.exports = { analyzeFinances, REPORT_VERSION, EFFICIENCY_BEST_THRESHOLD };
