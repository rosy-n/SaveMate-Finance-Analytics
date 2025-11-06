import React, { useMemo, useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { appBus } from './app/eventBus';
import Challenge from './components/Challenge';
import ChallengeDetail from './components/ChallengeDetail';

const Stack = createStackNavigator();

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

import TransactionInput from './components/TransactionInput';
import SatisfactionRating from './components/SatisfactionRating';
import IncomeDetail from './components/IncomeDetail';
import ExpenseDetail from './components/ExpenseDetail';
import { SaveMateStyles as styles } from './styles/SaveMateStyles';

import { useApi } from './hooks/useApi';
import useMonthlyTransactionsFromApi from './hooks/useMonthlyTransactionsFromApi';


const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const TODAY = NOW.getDate();

const WEEK_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const formatKRW = (amount) =>
  (typeof amount === 'number' ? amount : 0).toLocaleString('ko-KR') + '원';

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
  const progress = useRef(new Animated.Value(0)).current; // 0: amount, 1: income, 2: expense
  const { width } = useWindowDimensions();

  useEffect(() => {
    const idx = step === 'amount' ? 0 : step === 'income' ? 1 : 2;
    Animated.timing(progress, {
      toValue: idx,
      duration: 220, // 내부 전환만 살짝 애니메이션
      useNativeDriver: true,
    }).start();
  }, [step]);  

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
  const [showTransactionInput, setShowTransactionInput] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // 저장 후 목록 새로고침 트리거
  
  // API 헬스체크로 대체 (선택)
  const api = useApi();
  useEffect(() => {
    console.log('🔗 BASE_URL:', api.baseURL); // ✅ 추가
    api.get('/api/health')
      .then(() => console.log('✅ API 연결 OK'))
      .catch(e => console.error('❌ API 연결 실패:', e));
  }, [api]);

  const handleSatisfactionSubmit = async (payload) => {
    try {
      const res = await fetch(`${api.baseURL}/api/satisfaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        Alert.alert('저장 완료', '만족도 기록이 저장되었습니다 ✅');
        setPendingEvaluation(null);
        setCurrentPage('home');
      } else {
        Alert.alert('저장 실패', data.error || '서버 오류');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('네트워크 오류', '서버에 연결할 수 없습니다.');
    }
  };

  useEffect(() => {
    const off = appBus.on('open-entry-modal', (p) => {
      setEntryModal({ visible: true, step: p?.step ?? 'amount' });
    });
    return off;
  }, []);

    
  const [entryModal, setEntryModal] = useState({ visible: false, step: 'amount' });
  const [tempIncomeData, setTempIncomeData] = useState(null);
  const [tempExpenseData, setTempExpenseData] = useState(null);

  const handleSaveTransaction = (amount, type, pickedDate) => {
    const amt = Number(amount);
    // TransactionInput 이 넘기는 3번째 인자는 { category, memo, date } 객체임.
    const raw = pickedDate && pickedDate.date !== undefined ? pickedDate.date : pickedDate;
    const dateObj =
      raw instanceof Date
        ? raw
        : raw
        ? new Date(raw)
        : new Date();  

    if (type === 'income') {
      setTempIncomeData({ amount: isNaN(amt) ? 0 : amt, date: dateObj });
      setEntryModal(prev => ({ ...prev, visible: true, step: 'income' }));  // 모달 유지
    } else {
      setTempExpenseData({ amount: isNaN(amt) ? 0 : amt, date: dateObj });
      setEntryModal(prev => ({ ...prev, visible: true, step: 'expense' })); // 모달 유지
    }
  };


  // 이하 홈/디테일/만족도 화면
  const homeData = useMemo(
    () => ({
      userName: '노지은',
      userId: '2312736',
      motivationalQuote: {
        title: '오늘의 절약팁',
        content: '카페 대신 집에서 커피를 내려 마시면 한 달에 약 5만원을 절약할 수 있어요',
      },
      challengeProgress: {
        title: '카페 챌린지',
        progressRate: 73,
      },
    }),
    []
  );

  const getDaysInMonth = (month, year = CURRENT_YEAR) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year = CURRENT_YEAR) => new Date(year, month - 1, 1).getDay();

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

    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.appTitle}>Save Mate</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{homeData.motivationalQuote.title}</Text>
            <Text style={styles.cardText}>{homeData.motivationalQuote.content}</Text>
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

          <View style={styles.card}>
            <View className={styles.rowBetween}>
              <Text style={styles.cardTitle}>{homeData.challengeProgress.title}</Text>
              <Text style={styles.progressText}>
                {homeData.challengeProgress.progressRate}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${homeData.challengeProgress.progressRate}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>만족도 기록</Text>
            <Text style={[styles.cardText, { marginBottom: 12 }]}>
              어제 구매한 `식사`에 대한 만족도를 기록해주세요.
            </Text>
            <View style={styles.rowCenter}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setCurrentPage('home')}>
                <Text style={styles.btnGhostText}>나중에</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => {
                  setCurrentPage('satisfaction');
                }}
              >
                <Text style={styles.btnPrimaryText}>기록하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setEntryModal({ visible: true, step: 'amount' })}
        >
          <Text style={styles.fabPlus}>＋</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  const DetailPage = () => {
    // 1) 현재 월/이전 월 데이터 불러오기
    const { loading, error, groupedByDay, totalsByDay, monthlyTotals } =
      useMonthlyTransactionsFromApi({
        userId: homeData.userId,
        year: CURRENT_YEAR,
        month: selectedMonth,
        refresh: refreshKey,
      });
    const { monthlyTotals: prevTotals } =
      useMonthlyTransactionsFromApi({
        userId: homeData.userId,
        year: selectedMonth === 1 ? CURRENT_YEAR - 1 : CURRENT_YEAR,
        month: selectedMonth === 1 ? 12 : selectedMonth - 1,
        refresh: refreshKey,
      });

    // 2) 달력 계산(일수/시작요일)
    const daysInMonth = new Date(CURRENT_YEAR, selectedMonth, 0).getDate();
    const firstDay = new Date(CURRENT_YEAR, selectedMonth - 1, 1).getDay();

    // 3) 특정 일자 내역
    const selectedDayTransactions = groupedByDay[selectedDate] || [];

    // 4) 거래 존재 여부 맵
    const transactionsByDate = useMemo(() => {
      const map = {};
      Object.keys(groupedByDay).forEach((k) => { map[Number(k)] = true; });
      return map;
    }, [groupedByDay]);

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
                  if (diff > 0) return `${selectedMonth===1?12:selectedMonth-1}월보다 ${formatKRW(abs)} 더 썼어요`;
                  if (diff < 0) return `${selectedMonth===1?12:selectedMonth-1}월보다 ${formatKRW(abs)} 덜 썼어요`;
                  return `${selectedMonth===1?12:selectedMonth-1}월과 동일하게 썼어요`;
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
                const displayAmount = Math.abs(Number(transaction.amount)||0);

                return (
                  <View
                    key={transaction.id}
                    style={[
                      styles.txnRow,
                      index < selectedDayTransactions.length - 1 && styles.txnDivider,
                    ]}
                  >
                    <View style={styles.avatar}></View>
                    <View style={styles.txnBody}>
                      <Text
                        style={[styles.amountText, isIncome ? styles.income : styles.expense]}
                      >
                        {isIncome ? '+' : '-'}
                        {displayAmount.toLocaleString()}원
                      </Text>
                      <Text style={styles.txnMeta} numberOfLines={1}>
                        {(transaction.category || (isIncome ? '수입' : '지출'))} | {transaction.memo || ''}
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
      <Stack.Navigator>
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
                  handleSatisfactionSubmit({
                    uid: homeData.userId,
                    transactionId: payloadFromUI.transactionId,
                    emotion: payloadFromUI.rating,
                    reason: payloadFromUI.reason,
                    memo: payloadFromUI.memo,
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
                uid: homeData.userId,
                type: 'income',
                amount: Number(tempIncomeData?.amount || 0),
                category: incomeMethod,
                memo: incomeText?.trim() || '',
                date: tempIncomeData?.date?.toISOString?.() ?? new Date().toISOString(),
                incomeDetail: { incomeSource: incomeMethod, memo: incomeText?.trim() || '' }
              };
              await api.post('/api/transactions', payload);
              setEntryModal({ visible: false, step: 'amount' });
              setSelectedMonth((tempIncomeData?.date?.getMonth?.() ?? new Date().getMonth()) + 1);
              setSelectedDate(tempIncomeData?.date?.getDate?.() ?? new Date().getDate());
              setRefreshKey(k => k + 1);
              setCurrentPage('detail');
              Alert.alert('저장 완료', '수입이 기록되었어요 ✅');
            } catch (e) {
              console.error(e);
              Alert.alert('저장 실패', '서버 통신 오류가 발생했습니다.');
            }
          }}
          onExpenseSubmit={async ({ memo, method, category, background }) => {
            try {
              const amount = Number(tempExpenseData?.amount || 0);
              const dateISO = tempExpenseData?.date?.toISOString?.().slice(0,10);
              const uid = homeData.userId;

              const body = { uid, amount, type: 'expense', category, memo, date: dateISO, method, background };
              const res = await fetch(`${api.baseURL}/api/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
              const data = await res.json();
              if (!data.ok) throw new Error(data.error || '저장 실패');

              setEntryModal({ visible: false, step: 'amount' });
              setSelectedMonth((tempExpenseData?.date?.getMonth?.() ?? new Date().getMonth()) + 1);
              setSelectedDate(tempExpenseData?.date?.getDate?.() ?? new Date().getDate());
              setRefreshKey(k => k + 1);
              setCurrentPage('detail');
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
