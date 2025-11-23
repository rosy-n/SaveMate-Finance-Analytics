// components/styles/ReportStyles.js
import { StyleSheet } from 'react-native';

export const ReportStyles = StyleSheet.create({
  // 공통 레이아웃
  screen: { flex: 1, backgroundColor: '#F7F8FA' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  appTitle: { fontSize: 22, fontWeight: '800', color: '#7D4BD6', textAlign: 'center' },

  content: { paddingHorizontal: 16, paddingBottom: 32 },

  // 카드
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },

  // 텍스트
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#5C4DB1' },
  cardText: { fontSize: 14, color: '#444' },
  listTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  caption: { fontSize: 12, color: '#8a8f9c' },
  totalAmountSm: { fontSize: 16, fontWeight: '700', color: '#222' },
  totalAmount: { fontSize: 28, fontWeight: '800', color: '#111' },

  // 차트/리스트
  chartWrap: { alignItems: 'center', marginTop: 8 },
  catRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEFF2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: { width: 20, height: 20, borderRadius: 10 },

  itemRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EFEFF2' },


// 지출배경별 만족도 막대 그래프 스타일
    bgBlock: {
      marginBottom: 22,
    },
    bgLabel: {
      fontSize: 14,
      color: '#444',
      marginBottom: 4,
    },
    bgBarWrap: {
      height: 28,
      borderRadius: 14,
      overflow: 'hidden',
      flexDirection: 'row',
      backgroundColor: '#eee',
    },
    bgBarDissatisfied: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F4A7A7',
    },
    bgBarNeutral: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F7D8A4',
    },
    bgBarSatisfied: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#BFF8AA',
    },
    bgBarText: {
      fontSize: 12,
      color: 'gray-600',
      fontWeight: '600',
    },
  
    bgLegendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 6,
    },
    bgLegendItem: {
      fontSize: 12,
      marginRight: 10,
    },
    bgLegendD: { color: '#F4A7A7' },
    bgLegendN: { color: '#F7D8A4' },
    bgLegendS: { color: '#BFF8AA' },
  
});