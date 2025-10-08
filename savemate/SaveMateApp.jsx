// SaveMateApp.jsx
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

const WEEK_HEADERS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PILL_SIZE = 34;
const PILL_RADIUS = 12;

const formatKRW = (n) =>
  (typeof n === 'number' ? n : 0).toLocaleString('ko-KR') + '원';

const SaveMateApp = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedDate, setSelectedDate] = useState(15);

  const monthlyData = useMemo(
    () => ({
      9: {
        total: 890000,
        comparison: '5월보다 54만원 더 썼어요',
        transactions: {
          15: [
            { id: 1, amount: -20000, category: '카드', description: '스타벅스 라떼', hasAvatar: true },
            { id: 2, amount: 100000, category: '용돈', description: '세븐틴', hasAvatar: false },
          ],
          10: [{ id: 3, amount: -35000, category: '카드', description: '점심 회식', hasAvatar: false }],
          20: [{ id: 4, amount: -15000, category: '카드', description: '택시', hasAvatar: false }],
        },
      },
      8: { total: 750000, comparison: '7월보다 20만원 더 썼어요', transactions: {} },
      10: { total: 920000, comparison: '9월보다 3만원 더 썼어요', transactions: {} },
    }),
    []
  );

  const getDaysInMonth = (month, year = 2024) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year = 2024) => new Date(year, month - 1, 1).getDay();
  const today = 20;

  const BottomNav = ({ active, onNavigate }) => (
    <View style={styles.bottomNavWrapper}>
      <View style={styles.bottomNav}>
        <NavBtn label="홈" active={active === 'home'} icon="🏠" onPress={() => onNavigate('home')} />
        <NavBtn label="리포트" active={false} icon="📄" onPress={() => {}} />
        <NavBtn label="챌린지" active={false} icon="🏆" onPress={() => {}} />
        <NavBtn label="마이페이지" active={false} icon="👤" onPress={() => {}} />
      </View>
    </View>
  );

  const NavBtn = ({ label, icon, active, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.navBtn}>
      <Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const HomePage = () => (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>Save Mate</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>오늘의 절약팁</Text>
          <Text style={styles.cardText}>
            카페 대신 집에서 커피를 내려 마시면 한 달에 약 5만원을 절약할 수 있어요
          </Text>
        </View>

        <TouchableOpacity style={styles.card} onPress={() => setCurrentPage('detail')}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>9월 지출 현황</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
          <Text style={styles.totalAmount}>{formatKRW(monthlyData[9].total)}</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>커피 챌린지</Text>
            <Text style={styles.progressText}>73%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '73%' }]} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>만족도 기록</Text>
          <Text style={[styles.cardText, { marginBottom: 12 }]}>
            어제 구매한 '식사'에 대한 만족도를 기록해주세요.
          </Text>
          <View style={styles.rowCenter}>
            <TouchableOpacity style={styles.btnGhost}>
              <Text style={styles.btnGhostText}>나중에</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>기록하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabPlus}>＋</Text>
      </TouchableOpacity>

      <BottomNav active="home" onNavigate={setCurrentPage} />
    </SafeAreaView>
  );

  const DetailPage = () => {
    const currentData = monthlyData[selectedMonth] ?? { total: 0, comparison: '', transactions: {} };
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const transactions = currentData.transactions[selectedDate] || [];

    const handlePrevMonth = () => setSelectedMonth((prev) => (prev === 1 ? 12 : prev - 1));
    const handleNextMonth = () => setSelectedMonth((prev) => (prev === 12 ? 1 : prev + 1));

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
              <Text style={styles.totalAmount}>{formatKRW(currentData.total)}</Text>
            </View>
            <Text style={styles.comparisonText}>{currentData.comparison}</Text>

            <View style={[styles.rowCenter, { justifyContent: 'flex-end', marginBottom: 10 }]}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.monthBtn}>
                <Text style={styles.monthChevron}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} style={styles.monthBtn}>
                <Text style={styles.monthChevron}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekHeaderRow}>
              {WEEK_HEADERS.map((d) => (
                <Text key={d} style={styles.weekHeaderText}>{d}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.dayCell} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const date = i + 1;
                const isToday = date === today;
                const isSelected = date === selectedDate;
                const hasTransaction = !!currentData.transactions[date];

                return (
                  <TouchableOpacity
                    key={date}
                    style={styles.dayCell}
                    onPress={() => setSelectedDate(date)}
                    hitSlop={8}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        styles.pillText,
                        isToday && styles.pillBlueBg,
                        isSelected && styles.pillPurpleBg,
                        !isToday && !isSelected && date === 1 && styles.blueText,
                        hasTransaction && styles.boldText,
                      ]}
                      numberOfLines={1}
                    >
                      {date}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {transactions.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.dayTitle}>
                {selectedDate}일{' '}
                {['일', '월', '화', '수', '목', '금', '토'][new Date(2024, selectedMonth - 1, selectedDate).getDay()]}요일
              </Text>

              {transactions.map((t, idx) => {
                const isIncome = t.amount > 0;
                return (
                  <View key={t.id} style={[styles.txnRow, idx < transactions.length - 1 && styles.txnDivider]}>
                    <View style={styles.avatar}>
                      {t.hasAvatar ? <Text style={styles.avatarInner}>👤</Text> : null}
                    </View>
                    <View style={styles.txnBody}>
                      <Text style={[styles.amountText, isIncome ? styles.income : styles.expense]}>
                        {isIncome ? '' : '-'}
                        {Math.abs(t.amount).toLocaleString()}원
                      </Text>
                      <Text style={styles.txnMeta} numberOfLines={1}>
                        {t.category} | {t.description}
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

        <BottomNav active="home" onNavigate={setCurrentPage} />
      </SafeAreaView>
    );
  };

  return currentPage === 'home' ? <HomePage /> : <DetailPage />;
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },

  header: { backgroundColor: '#FFFFFF', paddingVertical: 16, alignItems: 'center' },
  appTitle: { fontSize: 22, fontWeight: '700', color: '#7C3AED' },

  content: { padding: 16, paddingBottom: 120, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
  progressBarBg: { width: '100%', height: 10, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#8B5CF6', borderRadius: 999 },

  btnGhost: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, borderColor: '#D1D5DB', marginRight: 8 },
  btnGhostText: { color: '#374151', fontSize: 14 },
  btnPrimary: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999, backgroundColor: '#F3E8FF', borderWidth: 1, borderColor: '#F3E8FF' },
  btnPrimaryText: { color: '#7C3AED', fontSize: 14, fontWeight: '600' },

  fab: { position: 'absolute', right: 16, bottom: 96, width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabPlus: { fontSize: 32, color: '#7C3AED', lineHeight: 34 },

  bottomNavWrapper: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  bottomNav: { height: 80, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 16 },
  navBtn: { alignItems: 'center' },
  navIcon: { fontSize: 20, color: '#9CA3AF' },
  navLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2, fontWeight: '500' },
  navActive: { color: '#7C3AED' },

  detailHeader: { backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  backChevron: { fontSize: 22, color: '#7C3AED' },
  detailTitle: { fontSize: 22, fontWeight: '700', color: '#7C3AED' },

  monthBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  monthChevron: { fontSize: 18, color: '#3B82F6' },
  weekHeaderRow: { flexDirection: 'row', marginBottom: 6, marginTop: 4 },
  weekHeaderText: { flex: 1, textAlign: 'center', color: '#9CA3AF', fontSize: 11, fontWeight: '600', paddingVertical: 6 },

  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },

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
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarInner: { fontSize: 18 },
  txnBody: { flex: 1 },
  amountText: { fontSize: 18, fontWeight: '700' },
  income: { color: '#10B981' },
  expense: { color: '#EF4444' },
  txnMeta: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },
});

export default SaveMateApp;
