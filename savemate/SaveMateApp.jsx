import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import TransactionInput from './components/TransactionInput';

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const TODAY = NOW.getDate();

const WEEK_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PILL_SIZE = 34;
const PILL_RADIUS = 12;

const formatKRW = (amount) =>
  (typeof amount === 'number' ? amount : 0).toLocaleString('ko-KR') + '원';

const SaveMateApp = () => {
  const now = new Date();
  const today = now.getDate();
  const realCurrentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [currentPage, setCurrentPage] = useState('home');
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [showTransactionInput, setShowTransactionInput] = useState(false);
  
  // 만족도 평가 상태
  const [satisfactionRating, setSatisfactionRating] = useState(null);
  const [selectedReason, setSelectedReason] = useState(null);
  const [satisfactionMemo, setSatisfactionMemo] = useState('');

  // API 응답 구조에 맞춘 홈 화면 데이터
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

  // 만족도 평가 데이터
  const satisfactionEvaluationData = useMemo(
    () => ({
      transactionId: 'txn_005',
      purchaseItem: '카페',
      amount: 15600,
      purchaseDate: '9월 14일',
      category: '카페',
    }),
    []
  );

  // 만족도별 이유 옵션
  const reasonOptions = useMemo(
    () => ({
      dissatisfied: ['품질 불만', '가격 불만', '과소비 / 불필요', '경제적 / 사회적 압박', '감정 억제 (후회)', '기타'],
      neutral: ['평범함', '일상적 / 습관적', '대안 없음', '기타'],
      satisfied: ['필요 충족', '감정 충족', '가성비 만족', '경험 / 성장', '사회적 유대', '기타'],
    }),
    []
  );

  // 만족도 평가 초기화
  const resetSatisfactionForm = () => {
    setSatisfactionRating(null);
    setSelectedReason(null);
    setSatisfactionMemo('');
  };

  // 만족도 평가 제출
  const handleSubmitSatisfaction = () => {
    const satisfactionData = {
      transactionId: satisfactionEvaluationData.transactionId,
      rating: satisfactionRating,
      reason: selectedReason,
      memo: satisfactionMemo,
      evaluatedAt: new Date().toISOString(),
    };
    
    console.log('만족도 평가 제출:', satisfactionData);
    
    resetSatisfactionForm();
    setCurrentPage('home');
  };

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

  const getDaysInMonth = (month, year = currentYear) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year = currentYear) => new Date(year, month - 1, 1).getDay();

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
                resetSatisfactionForm();
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
      year: currentYear,
      month: selectedMonth,
      monthlyTotal: 0,
      dailyExpenses: [],
    };

    const daysInMonth = getDaysInMonth(selectedMonth, currentYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, currentYear);

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
                const isToday = dateNum === today && selectedMonth === realCurrentMonth;
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
                    new Date(2024, selectedMonth - 1, selectedDate).getDay()
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

  const SatisfactionPage = () => {
    const currentReasons = satisfactionRating ? reasonOptions[satisfactionRating] : [];

    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            onPress={() => {
              resetSatisfactionForm();
              setCurrentPage('home');
            }} 
            style={styles.backBtn}
          >
            <Text style={styles.backChevron}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle}>만족도 평가</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.satisfactionQuestion}>
              어제의 '{satisfactionEvaluationData.purchaseItem}' 지출은 어떠셨나요?
            </Text>
            
            <View style={styles.amountBox}>
              <Text style={styles.satisfactionAmount}>
                {formatKRW(satisfactionEvaluationData.amount)}
              </Text>
              <Text style={styles.satisfactionDate}>
                {satisfactionEvaluationData.purchaseDate} | {satisfactionEvaluationData.category}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.emojiRow}>
              <TouchableOpacity
                style={[
                  styles.emojiButton,
                  satisfactionRating === 'dissatisfied' && styles.emojiButtonSelected,
                  satisfactionRating === 'dissatisfied' && styles.emojiButtonDissatisfied,
                ]}
                onPress={() => {
                  setSatisfactionRating('dissatisfied');
                  setSelectedReason(null);
                }}
              >
                <Text style={styles.emojiIcon}>😡</Text>
                <Text style={styles.emojiLabel}>불만족</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.emojiButton,
                  satisfactionRating === 'neutral' && styles.emojiButtonSelected,
                  satisfactionRating === 'neutral' && styles.emojiButtonNeutral,
                ]}
                onPress={() => {
                  setSatisfactionRating('neutral');
                  setSelectedReason(null);
                }}
              >
                <Text style={styles.emojiIcon}>😐</Text>
                <Text style={styles.emojiLabel}>보통</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.emojiButton,
                  satisfactionRating === 'satisfied' && styles.emojiButtonSelected,
                  satisfactionRating === 'satisfied' && styles.emojiButtonSatisfied,
                ]}
                onPress={() => {
                  setSatisfactionRating('satisfied');
                  setSelectedReason(null);
                }}
              >
                <Text style={styles.emojiIcon}>😆</Text>
                <Text style={styles.emojiLabel}>만족</Text>
              </TouchableOpacity>
            </View>
          </View>

          {satisfactionRating && (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>어떤 이유인가요?</Text>
                <View style={styles.reasonGrid}>
                  {currentReasons.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonChip,
                        selectedReason === reason && styles.reasonChipSelected,
                      ]}
                      onPress={() => setSelectedReason(reason)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          selectedReason === reason && styles.reasonChipTextSelected,
                        ]}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>메모</Text>
                <TextInput
                  style={styles.memoInput}
                  placeholder="기록하고 싶은 내용을 입력해주세요."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={satisfactionMemo}
                  onChangeText={setSatisfactionMemo}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => {
                    resetSatisfactionForm();
                    setCurrentPage('home');
                  }}
                >
                  <Text style={styles.btnSecondaryText}>다음에</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnPrimaryLarge}
                  onPress={handleSubmitSatisfaction}
                >
                  <Text style={styles.btnPrimaryLargeText}>기록하기</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        <BottomNav activePage="home" onNavigate={setCurrentPage} />
      </SafeAreaView>
    );
  };

  return (
    <>
      {currentPage === 'home' ? <HomePage /> : currentPage === 'satisfaction' ? <SatisfactionPage /> : <DetailPage />}

      <Modal 
        visible={showTransactionInput}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <TransactionInput 
          onClose={() => setShowTransactionInput(false)}
          onSave={(amount, type) => {
            console.log('저장:', amount, type);
            setShowTransactionInput(false);
          }}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#FFFFFF', paddingVertical: 16, alignItems: 'center' },
  appTitle: { fontSize: 22, fontWeight: '700', color: '#7C3AED' },
  content: { padding: 16, paddingBottom: 120, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#7C3AED', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#1F2937' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalAmount: { fontSize: 26, fontWeight: '700', color: '#111827' },
  comparisonText: { fontSize: 12, color: '#6B7280', textAlign: 'right', marginBottom: 12 },
  chevron: { fontSize: 20, color: '#9CA3AF' },
  progressText: { fontSize: 20, fontWeight: '700', color: '#111827' },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 20
  },
  progressBarFill: { height: '100%', backgroundColor: '#8B5CF6', borderRadius: 999 },
  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  btnGhostText: { color: '#374151', fontSize: 14 },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  btnPrimaryText: { color: '#7C3AED', fontSize: 14, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabPlus: { fontSize: 32, color: '#7C3AED', lineHeight: 34 },
  bottomNavWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bottomNav: {
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navBtn: { alignItems: 'center' },
  navIcon: { fontSize: 20, color: '#9CA3AF' },
  navLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2, fontWeight: '500' },
  navActive: { color: '#7C3AED' },
  detailHeader: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  backChevron: { fontSize: 22, color: '#7C3AED' },
  detailTitle: { fontSize: 22, fontWeight: '700', color: '#7C3AED' },
  monthBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  monthChevron: { fontSize: 18, color: '#3B82F6' },
  monthChevronDisabled: { color: '#D1D5DB' },
  weekHeaderRow: { flexDirection: 'row', marginBottom: 6, marginTop: 4 },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 6,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    minWidth: PILL_SIZE,
    height: PILL_SIZE,
    paddingHorizontal: 8,
    borderRadius: PILL_RADIUS,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: PILL_SIZE,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  pillBlueBg: { backgroundColor: '#DBEAFE', color: '#2563EB' },
  pillPurpleBg: { backgroundColor: '#F3E8FF', color: '#7C3AED' },
  blueText: { color: '#3B82F6' },
  boldText: { fontWeight: '800' },
  dayTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  txnDivider: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txnBody: { flex: 1 },
  amountText: { fontSize: 18, fontWeight: '700' },
  income: { color: '#10B981' },
  expense: { color: '#EF4444' },
  txnMeta: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
  
  // 만족도 평가 스타일
  satisfactionQuestion: { fontSize: 15, color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  amountBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  satisfactionAmount: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 4 },
  satisfactionDate: { fontSize: 13, color: '#6B7280' },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  emojiButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: { borderWidth: 2 },
  emojiButtonDissatisfied: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  emojiButtonNeutral: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  emojiButtonSatisfied: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  emojiIcon: { fontSize: 40, marginBottom: 8 },
  emojiLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonChipSelected: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7C3AED',
  },
  reasonChipText: { fontSize: 14, color: '#4B5563' },
  reasonChipTextSelected: { color: '#7C3AED', fontWeight: '600' },
  memoInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 15, color: '#374151', fontWeight: '600' },
  btnPrimaryLarge: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#F3E8FF',
    alignItems: 'center',
  },
  btnPrimaryLargeText: { fontSize: 15, color: '#7C3AED', fontWeight: '600' },
});

export default SaveMateApp;