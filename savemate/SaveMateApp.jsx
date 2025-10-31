import React, { useMemo, useState, useCallback, useEffect } from 'react';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
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
} from 'react-native';

import TransactionInput from './components/TransactionInput';
import SatisfactionRating from './components/SatisfactionRating';
import IncomeDetail from './components/IncomeDetail';
import ExpenseDetail from './components/ExpenseDetail';
import { SaveMateStyles as styles } from './styles/SaveMateStyles';

import { useApi } from './hooks/useApi';

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
  
  // API 헬스체크로 대체 (선택)
  const api = useApi();
  useEffect(() => {
    api.get('/api/health')
        .then(() => console.log('✅ API 연결 OK'))
        .catch(e => console.error('❌ API 연결 실패:', e));
  }, [api]);
  
  
  const handleSaveTransaction = useCallback(
    async (amount, type, extra = {}) => {
      try {
        const amt = Number(amount);
        if (!Number.isFinite(amt)) {
          Alert.alert('입력 오류', '금액을 숫자로 입력해 주세요.');
          return;
        }

        const payload = {
          uid: '2314513', 
          amount: amt,
          type,                               // 'income' | 'expense'
          category: extra.category || '기타',
          memo: extra.memo || '',
          date: new Date().toISOString().slice(0, 10),
        };

        await api.post('/api/transactions', payload /* , { token } */);
        Alert.alert('저장 완료', '서버 → Firestore 저장 성공 ✅');
      } catch (e) {
        console.error(e);
        Alert.alert('저장 실패', String(e?.message || e));
      } finally {
        setShowTransactionInput(false);
      }
    },
    [api]
  );


  const [entryModal, setEntryModal] = useState({ visible: false, step: 'amount' });
  const [tempIncomeData, setTempIncomeData] = useState(null);
  const [tempExpenseData, setTempExpenseData] = useState(null);
  // 프론트 1차 구현 (madeBy. 지은)
  /*
  const handleSaveTransaction = (amount, type, pickedDate) => {
  const amt = Number(amount);
  if (type === 'income') {
    setTempIncomeData({
      amount: isNaN(amt) ? 0 : amt,
      date: pickedDate ?? new Date(),
    });
    setEntryModal(prev => ({ ...prev, visible: true, step: 'income' }));
  } else {
    // 지출도 수입과 동일하게: 모달 유지 + 내부 화면만 'expense'로 전환
    setTempExpenseData({
      amount: isNaN(amt) ? 0 : amt,
      date: pickedDate ?? new Date(),
    });
    setEntryModal(prev => ({ ...prev, visible: true, step: 'expense' }));
  }

};*/


  // --- 이하 홈/디테일/만족도 화면은 기존 그대로 ---
  const homeData = useMemo(
    () => ({
      userName: '유은서',
      userId: '2314513',
      motivationalQuote: {
        title: '오늘의 절약팁',
        content: '카페 대신 집에서 커피를 내려 마시면 한 달에 약 5만원을 절약할 수 있어요',
      },
      expenseSummary: {
        currentMonth: '9월',
        totalExpense: 890000,
      },
      challengeProgress: {
        title: '카페 챌린지',
        progressRate: 73,
      },
    }),
    []
  );

  // DB 스키마에 맞춘 월별 데이터
  const monthlyExpenseData = useMemo(
    () => ({
      8: {
        year: 2025,
        month: 8,
        monthlyTotal: 750000,
        dailyExpenses: [],
      },
      9: {
        year: 2025,
        month: 9,
        monthlyTotal: 890000,
        dailyExpenses: [
          {
            date: '2025-09-15',
            totalAmount: 120000,
            transactions: [
              {
                transactionId: 'txn_001',
                type: 'expense',
                amount: -20000,
                category: '카페',
                time: '14:30',
                memo: '스타벅스 라떼',
              },
              {
                transactionId: 'txn_002',
                type: 'income',
                amount: 100000,
                category: '용돈',
                time: '18:00',
                memo: '세븐틴',
              },
            ],
          },
          {
            date: '2025-09-10',
            totalAmount: 35000,
            transactions: [
              {
                transactionId: 'txn_003',
                type: 'expense',
                amount: -35000,
                category: '식비',
                time: '12:30',
                memo: '점심 회식',
              },
            ],
          },
          {
            date: '2025-09-20',
            totalAmount: 15000,
            transactions: [
              {
                transactionId: 'txn_004',
                type: 'expense',
                amount: -15000,
                category: '교통',
                time: '22:00',
                memo: '택시',
              },
            ],
          },
        ],
      },
      10: {
        year: 2025,
        month: 10,
        monthlyTotal: 920000,
        dailyExpenses: [],
      },
    }),
    []
  );

  // 저번 달과의 비교 메시지 생성
  const getComparisonMessage = (currentMonth) => {
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const currentData = monthlyExpenseData[currentMonth];
    const previousData = monthlyExpenseData[previousMonth];

    if (!currentData || !previousData) {
      return '';
    }

    const difference = currentData.monthlyTotal - previousData.monthlyTotal;
    const absDifference = Math.abs(difference);

    if (difference > 0) {
      return `${previousMonth}월보다 ${formatKRW(absDifference)} 더 썼어요`;
    } else if (difference < 0) {
      return `${previousMonth}월보다 ${formatKRW(absDifference)} 덜 썼어요`;
    } else {
      return `${previousMonth}월과 동일하게 썼어요`;
    }
  };

  const getDaysInMonth = (month, year = CURRENT_YEAR) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year = CURRENT_YEAR) => new Date(year, month - 1, 1).getDay();

  const BottomNav = ({ activePage, onNavigate }) => (
    <View style={styles.bottomNavWrapper}>
      <View style={styles.bottomNav}>
        <NavButton
          label="홈"
          isActive={activePage === 'home'}
          icon="🏠"
          onPress={() => onNavigate('home')}
        />
        <NavButton label="리포트" isActive={false} icon="📄" onPress={() => {}} />
        <NavButton label="챌린지" isActive={false} icon="🏆" onPress={() => {}} />
        <NavButton label="마이페이지" isActive={false} icon="👤" onPress={() => {}} />
      </View>
    </View>
  );

  const NavButton = ({ label, icon, isActive, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.navBtn}>
      <Text style={[styles.navIcon, isActive && styles.navActive]}>{icon}</Text>
      <Text style={[styles.navLabel, isActive && styles.navActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const HomePage = () => (
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
              {homeData.expenseSummary.currentMonth} 지출 현황
            </Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <Text style={styles.totalAmount}>
            {formatKRW(homeData.expenseSummary.totalExpense)}
          </Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
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

      <TouchableOpacity style={styles.fab} onPress={() => setShowTransactionInput(true)}>
        <Text style={styles.fabPlus}>＋</Text>
      </TouchableOpacity>

      <BottomNav activePage="home" onNavigate={setCurrentPage} />
    </SafeAreaView>
  );
  const DetailPage = () => {
    const currentMonthData = monthlyExpenseData[selectedMonth] ?? {
      year: CURRENT_YEAR,
      month: selectedMonth,
      monthlyTotal: 0,
      dailyExpenses: [],
    };

    const daysInMonth = getDaysInMonth(selectedMonth, CURRENT_YEAR);
    const firstDay = getFirstDayOfMonth(selectedMonth, CURRENT_YEAR);

    const selectedDayTransactions =
      currentMonthData.dailyExpenses.find((daily) => {
        const dateNum = parseInt(daily.date.split('-')[2]);
        return dateNum === selectedDate;
      })?.transactions || [];

    const transactionsByDate = useMemo(() => {
      const map = {};
      currentMonthData.dailyExpenses.forEach((daily) => {
        const dateNum = parseInt(daily.date.split('-')[2]);
        map[dateNum] = true;
      });
      return map;
    }, [currentMonthData.dailyExpenses]);

    const handlePrevMonth = () => setSelectedMonth((prev) => Math.max(1, prev - 1));
    const handleNextMonth = () => setSelectedMonth((prev) => Math.min(CURRENT_MONTH, prev + 1));

    const canGoPrev = selectedMonth > 1;
    const canGoNext = selectedMonth < CURRENT_MONTH;

    const comparisonMessage = getComparisonMessage(selectedMonth);

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
                {formatKRW(currentMonthData.monthlyTotal)}
              </Text>
            </View>
            <Text style={styles.comparisonText}>{comparisonMessage}</Text>

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
                const isIncome = transaction.type === 'income';
                const displayAmount = Math.abs(transaction.amount);

                return (
                  <View
                    key={transaction.transactionId}
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
                        {transaction.category} | {transaction.memo}
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

        <BottomNav activePage="home" onNavigate={setCurrentPage} />
      </SafeAreaView>
    );
  };
  

  return (
    <>
      {currentPage === 'home' ? (
        <HomePage />
      ) : currentPage === 'satisfaction' ? (
        <SatisfactionRating
          styles={styles}
          onBack={() => setCurrentPage('home')}
          bottomNav={<BottomNav activePage="home" onNavigate={setCurrentPage} />}
        />
      ) : (
        <DetailPage />
      )}


      {/* ✅ 거래 입력 모달 */}
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
          onIncomeSubmit={({ incomeText, incomeMethod }) => {            
            setEntryModal({ visible: false, step: 'amount' });
            setCurrentPage('home');
            Alert.alert('저장 완료', '수입이 기록되었어요 ✅');
          }}
          onExpenseSubmit={({ memo, method, category, background }) => {
            setEntryModal({ visible: false, step: 'amount' });
            setCurrentPage('home');
            Alert.alert('저장 완료', '지출이 기록되었어요 ✅');
          }}
          tempIncomeData={tempIncomeData}
          tempExpenseData={tempExpenseData}          
        />
      </Modal>


    </>
  );

};
