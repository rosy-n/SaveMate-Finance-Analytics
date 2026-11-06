import { getAppNow } from './constants/appDate';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Animated,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appBus } from './app/eventBus';
import { loadPendingByCreatedAt } from './hooks/loadPendingByCreatedAt';
import HomeChallengeCard from './components/HomeChallengeCard';
import { getCategoryIcon } from './constants/categoryIcons';
import TransactionInput from './components/TransactionInput';
import SatisfactionRating from './components/SatisfactionRating';
import IncomeDetail from './components/IncomeDetail';
import ExpenseDetail from './components/ExpenseDetail';
import { SaveMateStyles as styles } from './styles/SaveMateStyles';
import { useApi } from './hooks/useApi';
import useMonthlyTransactionsFromApi from './hooks/useMonthlyTransactionsFromApi';
import { useAuth } from './state/AuthContext';
import useTodayTip from './hooks/useTodayTip';

const Stack = createStackNavigator();

const NOW = getAppNow();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const TODAY = NOW.getDate();

const WEEK_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// 데이터가 없을 때 매 렌더링마다 새 객체가 만들어지지 않도록 재사용한다.
const EMPTY_GROUPS = {};

const formatKRW = (amount) =>
  (typeof amount === 'number' ? amount : 0).toLocaleString('ko-KR') + '원';

// 로컬 기준 YYYY-MM-DD로 포맷팅
const toLocalDateString = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// 달력에서 지출이 많은 날의 기준: 일별 지출의 Q3 + 1.5*IQR (리포트의 이상치 기준과 동일)
const MIN_DAYS_FOR_HIGH_EXPENSE = 10;

const highExpenseThreshold = (totalsByDay) => {
  const amounts = Object.values(totalsByDay || {})
    .map((t) => t.expense)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  if (amounts.length < 4) return Infinity;

  const quantile = (q) => {
    const pos = (amounts.length - 1) * q;
    const lower = Math.floor(pos);
    const upper = amounts[lower + 1] ?? amounts[lower];
    return amounts[lower] + (pos - lower) * (upper - amounts[lower]);
  };
  const q1 = quantile(0.25);
  const q3 = quantile(0.75);
  return q3 + 1.5 * (q3 - q1);
};

// 만족도 평가 박스 UI 표시용: "M월 D일"
const fmtMonthDayKR = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
};

const EntryFlow = ({
  step,               // 'amount' | 'income' | 'expense'
  onClose,
  onAmountSave,
  onIncomeSubmit,
  onExpenseSubmit,
  goToAmount,
  tempIncomeData,
  tempExpenseData,
}) => {
  // 0: amount, 1: income, 2: expense. 한 번만 만들어 계속 쓰는 Animated.Value
  const [progress] = useState(() => new Animated.Value(0));
  const { width } = useWindowDimensions();

  useEffect(() => {
    const idx = step === 'amount' ? 0 : step === 'income' ? 1 : 2;
    Animated.timing(progress, {
      toValue: idx,
      duration: 220, // 내부 전환만 살짝 애니메이션
      useNativeDriver: true,
    }).start();
  }, [step, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, -width, -2 * width],
  });
  return (
    <View style={efStyles.container}>
      <Animated.View style={[efStyles.track, { width: width * 3, transform: [{ translateX }] }]}>
        <View style={[efStyles.page, { width }]}>
          <TransactionInput onClose={onClose} onSave={onAmountSave} />
        </View>
        <View style={[efStyles.page, { width }]}>
          <IncomeDetail onBack={goToAmount} onSubmit={onIncomeSubmit} />
        </View>
        <View style={[efStyles.page, { width }]}>
          <ExpenseDetail
            onBack={goToAmount}
            onSubmit={onExpenseSubmit}
            amount={tempExpenseData?.amount}
            date={tempExpenseData?.date}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const efStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  track: { flex: 1, flexDirection: 'row' },
  page: { flex: 1 },
});

export default function SaveMateApp() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [refreshKey, setRefreshKey] = useState(0); // 저장 후 목록 새로고침 트리거

  // 만족도 평가용 상태
  const [pendingEvaluation, setPendingEvaluation] = useState(null); // 평가 화면에 넘길 거래
  const [pendingList, setPendingList] = useState([]);  // 미평가 지출 큐
  const [pendingIndex, setPendingIndex] = useState(0); // 현재 보여줄 큐 인덱스

  useEffect(() => {
    const handler = () => setCurrentPage('home');  // ✅ 함수
    const off = appBus.on('homeTabPressed', handler); // on() 이 off 함수를 리턴하는 구현인 경우
    return () => off && off(); // 구현이 off()를 리턴하지 않으면 appBus.off('homeTabPressed', handler) 사용
  }, []);

  // 홈 탭으로 돌아올 때 챌린지 카드를 갱신한다.
  // (state 를 바꾸면 HomePage 전체가 다시 마운트되므로 이벤트로 카드에만 알린다.)
  useFocusEffect(
    useCallback(() => {
      appBus.emit('home-focused');
    }, [])
  );

  // API 헬스체크로 대체
  const api = useApi();
  useEffect(() => {
    api.get('/api/health').catch(e => console.error('❌ API 연결 실패:', api.baseURL, e));
  }, [api]);

  const handleSatisfactionSubmit = async (payload) => {
    try {
      const data = await api.post('/api/satisfaction', {
        transactionId: payload.transactionId,
        emotion: payload.emotion,
        reasons: payload.reasons,
        memo: payload.memo,
      });

      if (data.ok) {
        Alert.alert('저장 완료', '만족도 기록이 저장되었습니다 ✅');
        // 1) 로컬 큐에서 제거
        setPendingList(list => list.filter(x => x.id !== payload.transactionId));
        // 2) 평가 화면 닫고 홈으로
        setPendingEvaluation(null);
        setCurrentPage('home');
        // 3) (선택) 서버 정합성 재로딩 트리거
        setRefreshKey(k => k + 1);
        // 큐가 비었을 때 인덱스 0으로
        setPendingIndex(i => 0);
      } else {
        Alert.alert('저장 실패', data.error || '서버 오류');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('네트워크 오류', '서버에 연결할 수 없습니다.');
    }
  };


  const [entryModal, setEntryModal] = useState({ visible: false, step: 'amount' });
  const [tempIncomeData, setTempIncomeData] = useState(null);
  const [tempExpenseData, setTempExpenseData] = useState(null);

  useEffect(() => {
    const off = appBus.on('open-entry-modal', (p) => {
      setEntryModal({ visible: true, step: p?.step ?? 'amount' });
    });
    return off;
  }, []);

  const handleSaveTransaction = (amount, type, pickedDate) => {
    const amt = Number(amount);
    // TransactionInput 이 넘기는 3번째 인자는 { category, memo, date } 객체임.
    const raw = pickedDate && pickedDate.date !== undefined ? pickedDate.date : pickedDate;
    const dateObj =
      raw instanceof Date
        ? raw
        : raw
          ? new Date(raw)
          : getAppNow();

    if (type === 'income') {
      setTempIncomeData({ amount: isNaN(amt) ? 0 : amt, date: dateObj });
      setEntryModal(prev => ({ ...prev, visible: true, step: 'income' }));
    } else {
      setTempExpenseData({ amount: isNaN(amt) ? 0 : amt, date: dateObj });
      setEntryModal(prev => ({ ...prev, visible: true, step: 'expense' }));
    }
  };


  // 이하 홈/디테일/만족도 화면
  const { user } = useAuth();
  const UID = user?.id;
  const homeData = useMemo(
    () => ({
      userName: user?.nickname ?? '이름',
      userId: UID,
      motivationalQuote: {
        title: '오늘의 절약팁',
        content: '카페 대신 집에서 커피를 내려 마시면 한 달에 약 5만원을 절약할 수 있어요',
      },
    }),
    [UID, user]
  );


  const HomePage = () => {
    // 당월 지출 합계 로드
    const { loading: homeLoading, error: homeError, monthlyTotals: homeMonthlyTotals } =
      useMonthlyTransactionsFromApi({
        userId: homeData.userId,
        year: CURRENT_YEAR,
        month: CURRENT_MONTH,
        refresh: refreshKey,
      });
    const totalExpenseThisMonth = homeMonthlyTotals?.expense ?? 0;

    const todayTip = useTodayTip(homeData.userId);

    // 만족도 평가 안한 지출내역들을 넣는 미평가 큐
    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          // 새 함수 사용: createdAt 기준 최신순 + 미평가만 반환
          const pending = await loadPendingByCreatedAt({ api, uid: homeData.userId, cap: 50 });

          if (!mounted) return;
          setPendingList(pending);
          setPendingIndex(0);
        } catch (e) {
          // useApi가 HTTP 에러/JSON 파싱 에러를 일반 Error 객체로 변환해주므로,
          // catch 블록이 예상치 못한 HTML 응답으로 인한 JSON.parse 오류를 받지 않음.
          console.error('pending queue load failed', e);
          if (!mounted) return;
          setPendingList([]);
          setPendingIndex(0);
        }
      })();
      return () => { mounted = false; };
    // HomePage 는 SaveMateApp 안에서 정의돼 refreshKey/api 가 바깥 값이라 규칙이 불필요하다고 판단하지만,
    // 새로고침 트리거와 다시 마운트되는 시점에 미평가 목록을 다시 불러오려면 필요하다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey, api]);

    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>Save Mate</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, styles.tipCard]}>
            <Text style={styles.cardTitle}>오늘의 절약팁</Text>

            <Text style={styles.cardText}>{todayTip.content}</Text>
          </View>


          <TouchableOpacity style={styles.card} onPress={() => setCurrentPage('detail')}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>
                {CURRENT_MONTH}월 지출 현황
              </Text>
              <Text style={styles.chevron}>›</Text>
            </View>

            <Text style={styles.totalAmount}>
              {homeLoading ? '계산 중…' : formatKRW(totalExpenseThisMonth)}
            </Text>

            {homeError ? (
              <Text style={[styles.cardText, { marginTop: 6, color: '#B43A22' }]}>
                합계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
              </Text>
            ) : null}
          </TouchableOpacity>

          <HomeChallengeCard refreshKey={refreshKey} />

          {pendingList.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>만족도 기록</Text>
              {(() => {
                const t = pendingList[pendingIndex % pendingList.length];
                return (
                  <Text style={[styles.cardText, { marginBottom: 12 }]}>
                    {fmtMonthDayKR(t.date)}에 지출한 ‘{t.memo || '지출'}’에 대한 만족도를 기록해주세요.
                  </Text>
                );
              })()}
              <View style={styles.rowCenter}>
                {/* 나중에 → 큐에서 다음 항목 보여주기 */}
                <TouchableOpacity
                  style={styles.btnGhost}
                  onPress={() => setPendingIndex(i => (i + 1) % pendingList.length)}
                >
                  <Text style={styles.btnGhostText}>나중에</Text>
                </TouchableOpacity>

                {/* 기록하기 → 평가 화면으로 이동 */}
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => {
                    const t = pendingList[pendingIndex % pendingList.length];
                    setPendingEvaluation({
                      transactionId: t.id,
                      purchaseItem: t.memo || t.category || '지출',
                      amount: t.amount,
                      purchaseDate: t.date, // 원본 전달
                      category: t.category || '지출',
                    });
                    setCurrentPage('satisfaction');
                  }}
                >
                  <Text style={styles.btnPrimaryText}>기록하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}



        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setEntryModal({ visible: true, step: 'amount' })}
        >
          <Ionicons name="add" size={36} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  const DetailPage = () => {
    // 1) 현재 월/이전 월 데이터 불러오기
    const { groupedByDay, totalsByDay, monthlyTotals } =
      useMonthlyTransactionsFromApi({
        userId: homeData.userId,
        year: CURRENT_YEAR,
        month: selectedMonth,
        refresh: 0,
      });
    const { monthlyTotals: prevTotals, totalsByDay: prevTotalsByDay } =
      useMonthlyTransactionsFromApi({
        userId: homeData.userId,
        year: selectedMonth === 1 ? CURRENT_YEAR - 1 : CURRENT_YEAR,
        month: selectedMonth === 1 ? 12 : selectedMonth - 1,
        refresh: 0,
      });

    // 훅이 제공하는 groupedByDay만 사용합니다.
    const effectiveGrouped = groupedByDay || EMPTY_GROUPS;

    // 2) 달력 계산(일수/시작요일)
    const daysInMonth = new Date(CURRENT_YEAR, selectedMonth, 0).getDate();
    const firstDay = new Date(CURRENT_YEAR, selectedMonth - 1, 1).getDay();

    // 3) 특정 일자 내역
    const selectedDayTransactions = effectiveGrouped[selectedDate] || [];

    // 4) 거래 존재 여부 맵
    const transactionsByDate = useMemo(() => {
      const map = {};
      Object.keys(effectiveGrouped).forEach((k) => { map[Number(k)] = true; });
      return map;
    }, [effectiveGrouped]);

    // 지출이 많은 날 기준. 월초처럼 기록이 적은 달은 지난달 기준을 쓴다.
    const expenseDayCount = Object.values(totalsByDay || {}).filter((t) => t.expense > 0).length;
    const highExpense = highExpenseThreshold(
      expenseDayCount >= MIN_DAYS_FOR_HIGH_EXPENSE ? totalsByDay : prevTotalsByDay
    );

    const handlePrevMonth = () => setSelectedMonth((prev) => Math.max(1, prev - 1));
    const handleNextMonth = () => setSelectedMonth((prev) => Math.min(CURRENT_MONTH, prev + 1));

    const canGoPrev = selectedMonth > 1;
    const canGoNext = selectedMonth < CURRENT_MONTH;

    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setCurrentPage('home')} style={styles.backBtn}>
            <Text style={styles.backChevron}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle}>{selectedMonth}월</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.totalAmount}>
                {formatKRW(monthlyTotals?.expense || 0)}  {/* 월 총 지출 */}
              </Text>

              <Text style={styles.comparisonText}>
                {(() => {
                  const prevExpense = prevTotals?.expense || 0;
                  const diff = (monthlyTotals?.expense || 0) - prevExpense;
                  const abs = Math.abs(diff);
                  if (diff > 0) return `${selectedMonth === 1 ? 12 : selectedMonth - 1}월보다 ${formatKRW(abs)} 더 썼어요`;
                  if (diff < 0) return `${selectedMonth === 1 ? 12 : selectedMonth - 1}월보다 ${formatKRW(abs)} 덜 썼어요`;
                  return `${selectedMonth === 1 ? 12 : selectedMonth - 1}월과 동일하게 썼어요`;
                })()}
              </Text>
            </View>

            <View style={[styles.rowCenter, { justifyContent: 'flex-end', marginBottom: 10 }]}>
              <TouchableOpacity
                onPress={canGoPrev ? handlePrevMonth : undefined}
                style={styles.monthBtn}
                disabled={!canGoPrev}
              >
                <Text
                  style={[
                    styles.monthChevron,
                    !canGoPrev && styles.monthChevronDisabled,
                  ]}
                >
                  ‹
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={canGoNext ? handleNextMonth : undefined}
                style={styles.monthBtn}
                disabled={!canGoNext}
              >
                <Text
                  style={[
                    styles.monthChevron,
                    !canGoNext && styles.monthChevronDisabled,
                  ]}
                >
                  ›
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekHeaderRow}>
              {WEEK_HEADERS.map((dayLabel) => (
                <Text key={dayLabel} style={styles.weekHeaderText}>
                  {dayLabel}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {Array.from({ length: firstDay }).map((_, index) => (
                <View key={`empty-${index}`} style={styles.dayCell} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const dateNum = index + 1;
                const isToday = dateNum === TODAY && selectedMonth === CURRENT_MONTH;
                const isSelected = dateNum === selectedDate;
                const hasTransaction = transactionsByDate[dateNum];
                const dayTotals = totalsByDay?.[dateNum];

                return (
                  <TouchableOpacity
                    key={dateNum}
                    style={styles.dayCell}
                    onPress={() => setSelectedDate(dateNum)}
                    hitSlop={8}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        styles.pillText,
                        isToday && styles.pillBlueBg,
                        isSelected && styles.pillPurpleBg,
                        hasTransaction && styles.boldText,
                      ]}
                      numberOfLines={1}
                    >
                      {dateNum}
                    </Text>
                    {dayTotals?.income > 0 && (
                      <Text
                        allowFontScaling={false}
                        style={[styles.dayAmount, styles.income]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        +{dayTotals.income.toLocaleString('ko-KR')}
                      </Text>
                    )}
                    {dayTotals?.expense > 0 && (
                      <Text
                        allowFontScaling={false}
                        style={[
                          styles.dayAmount,
                          dayTotals.expense > highExpense ? styles.expense : styles.dayAmountExpense,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        -{dayTotals.expense.toLocaleString('ko-KR')}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {selectedDayTransactions.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.dayTitle}>
                {selectedDate}일{' '}
                {
                  ['일', '월', '화', '수', '목', '금', '토'][
                  new Date(CURRENT_YEAR, selectedMonth - 1, selectedDate).getDay()
                  ]
                }
                요일
              </Text>

              {selectedDayTransactions.map((transaction, index) => {
                const isIncome = (transaction.type || '').toLowerCase() === 'income';
                const displayAmount = Math.abs(Number(transaction.amount) || 0);
                const category = transaction.category || (isIncome ? '수입' : '지출');
                const icon = getCategoryIcon(category); 

                return (
                  <View
                    key={transaction.id}
                    style={[
                      styles.txnRow,
                      index < selectedDayTransactions.length - 1 && styles.txnDivider,
                    ]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.categoryIcon}>{icon}</Text>
                    </View>
                    <View style={styles.txnBody}>
                      <Text
                        style={[styles.amountText, isIncome ? styles.income : styles.expense]}
                      >
                        {isIncome ? '+' : '-'}
                        {displayAmount.toLocaleString()}원
                      </Text>
                      <Text style={styles.txnMeta} numberOfLines={1}>
                        {category} | {transaction.memo || ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
              <Text style={styles.emptyText}>이 날짜에 기록된 내역이 없습니다</Text>
            </View>
          )}
        </ScrollView>

      </SafeAreaView>
    );
  };

  return (
    <>
      {/* expo-router 58은 react-navigation을 내장해서 쓰므로, 이 Stack은 독립 컨테이너가 필요함 */}
      <NavigationContainer independent>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentPage === 'home' ? (
          <Stack.Screen name="Home">
            {() => <HomePage />}
          </Stack.Screen>
        ) : currentPage === 'satisfaction' ? (
          <Stack.Screen name="Satisfaction">
            {() => (
              <SatisfactionRating
                styles={styles}
                evaluationData={pendingEvaluation ?? undefined}
                onBack={() => { setPendingEvaluation(null); setCurrentPage('home'); }}
                onSubmit={(payloadFromUI) => {
                  // payloadFromUI 구조분해를 통해 서버에 필요한 필드를 명확히 지정
                  const {
                    transactionId,
                    emotion,
                    rating, // emotion 대신 rating 키가 넘어올 경우 대비 (Safety)
                    reason,
                    memo
                  } = payloadFromUI;

                  handleSatisfactionSubmit({
                    transactionId: transactionId,
                    emotion: emotion ?? rating, // emotion이 우선, 없으면 rating 사용
                    reasons: reason,             // reason 필드 명확히 전달
                    memo: memo,
                  });
                }}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Detail">
            {() => <DetailPage />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
      </NavigationContainer>

      {/* 거래 입력 모달 */}
      <Modal
        visible={entryModal.visible}
        animationType="none"
        presentationStyle="fullScreen"
        onRequestClose={() => setEntryModal({ visible: false, step: 'amount' })}
      >
        <EntryFlow
          step={entryModal.step}
          onClose={() => setEntryModal({ visible: false, step: 'amount' })}
          onAmountSave={handleSaveTransaction}
          goToAmount={() => setEntryModal(prev => ({ ...prev, step: 'amount' }))}
          onIncomeSubmit={async ({ incomeText, incomeMethod }) => {
            try {
              const payload = {
                type: 'income',
                amount: Number(tempIncomeData?.amount || 0),
                category: incomeMethod,
                memo: incomeText?.trim() || '',
                date: toLocalDateString(tempIncomeData?.date || getAppNow()),
                incomeDetail: { incomeSource: incomeMethod, memo: incomeText?.trim() || '' }
              };
              await api.post('/api/transactions', payload);
              setEntryModal({ visible: false, step: 'amount' });
              setSelectedMonth((tempIncomeData?.date?.getMonth?.() ?? getAppNow().getMonth()) + 1);
              setSelectedDate(tempIncomeData?.date?.getDate?.() ?? getAppNow().getDate());
              setRefreshKey(k => k + 1);
              setCurrentPage('home');
              Alert.alert('저장 완료', '수입이 기록되었어요 ✅');
            } catch (e) {
              console.error(e);
              Alert.alert('저장 실패', '서버 통신 오류가 발생했습니다.');
            }
          }}

          onExpenseSubmit={async ({ memo, method, category, background }) => {
            try {
              const amount = Number(tempExpenseData?.amount || 0);
              const dateISO = toLocalDateString(tempExpenseData?.date || getAppNow());

              const body = { amount, type: 'expense', category, memo, date: dateISO, method, background };
              // useApi 가 Authorization 헤더를 붙이고, 서버가 보낸 에러 메시지를 Error 로 던진다.
              await api.post('/api/transactions', body);

              setEntryModal({ visible: false, step: 'amount' });
              setSelectedMonth((tempExpenseData?.date?.getMonth?.() ?? getAppNow().getMonth()) + 1);
              setSelectedDate(tempExpenseData?.date?.getDate?.() ?? getAppNow().getDate());
              setRefreshKey(k => k + 1);
              setCurrentPage('home');
              Alert.alert('저장 완료', '지출이 기록되었어요 ✅');
            } catch (e) {
              console.error(e);
              Alert.alert('저장 실패', e.message || '서버 오류');
            }
          }}


          tempIncomeData={tempIncomeData}
          tempExpenseData={tempExpenseData}
        />
      </Modal>
    </>
  );
};
