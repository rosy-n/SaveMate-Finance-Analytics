// components/styles/ReportStyles.js
import { StyleSheet } from 'react-native';

export const ReportStyles = StyleSheet.create({
  // 공통 레이아웃
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#F9FAFB', paddingVertical: 16, alignItems: 'center' },
  appTitle: { fontSize: 22, fontWeight: '700', color: '#7C3AED' },

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
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#7C3AED' },
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


  // 이번달 지출 worst 3 스타일
  worstRow: {
    flexDirection: 'row',
    alignItems: 'center',   
    minHeight: 70,          
  },

  worstRank: {
    fontSize: 28,
    fontWeight: '800',
    color: '#7C3AED',
    width: 18,
    textAlign: 'center',
  },

  worstLeft: {
    flex: 0.9,           
    paddingLeft: 14,
  },

  worstRight: {
    flex: 1.4,           
    paddingLeft: 12,
  },

  worstTitle: {
    fontSize: 15,        
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 3,
  },

  worstSub: {
    fontSize: 12,        
    color: '#666',
    marginTop: 1,
  },

  worstContainer: {
    borderWidth: 2,
    borderColor: '#D9C6FF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 10,
    backgroundColor: '#fff',
  },
  worstDate: {
    fontSize: 12,    
    color: '#888',
    marginBottom: 4,
  },
  worstAmount: {
    fontSize: 20,    
    fontWeight: '800',
    color: '#000',
  },
  highlightText: {
    //fontWeight: "800",
    color: "#222",
    backgroundColor: "#EEE7FF",
    paddingHorizontal: 3,
    borderRadius: 4,
  },

  highlightText1: {
    //fontWeight: "800",
    color: "#222",
    backgroundColor: "#f5d5d5ff",
    paddingHorizontal: 3,
    borderRadius: 4,
  },
  highlightText2: {
    //fontWeight: "800",
    color: "#222",
    backgroundColor: "#f4e4c8ff",
    paddingHorizontal: 3,
    borderRadius: 4,
  },
  highlightText3: {
    //fontWeight: "800",
    color: "#222",
    backgroundColor: "#daefd3ff",
    paddingHorizontal: 3,
    borderRadius: 4,
  },
});