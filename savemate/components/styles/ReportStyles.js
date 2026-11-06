// components/styles/ReportStyles.js
import { StyleSheet } from 'react-native';

export const ReportStyles = StyleSheet.create({
  // 공통 레이아웃
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#F9FAFB', paddingVertical: 16, alignItems: 'center' },
  appTitle: { fontSize: 22, fontWeight: '700', color: '#7C3AED' },

  content: { paddingHorizontal: 16, paddingBottom: 32 },

  sectionNavWrap: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    zIndex: 20,
  },
  sectionNav: { gap: 8, paddingRight: 8 },
  sectionNavButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionNavButtonActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  sectionNavText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  sectionNavTextActive: { color: '#FFFFFF' },

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
  totalAmountSm: { fontSize: 17, fontWeight: '700', color: '#222' },
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

  metricBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F5F0FF',
  },
  metricLabel: { fontSize: 13, fontWeight: '600', color: '#6D5A91' },
  metricValue: { fontSize: 28, fontWeight: '800', color: '#7C3AED', marginVertical: 4 },
  metricInsight: { fontSize: 17, lineHeight: 25, fontWeight: '700', color: '#4C1D95', marginTop: 8 },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFF2',
  },
  analyticsScore: { fontSize: 16, fontWeight: '800', color: '#7C3AED' },
  efficiencyWorstScore: { fontSize: 16, fontWeight: '800', color: '#C24141' },
  efficiencyGroupTitle: {
    marginTop: 14,
    marginBottom: 2,
    fontSize: 13,
    fontWeight: '800',
    color: '#7C3AED',
  },
  efficiencyWorstTitle: { color: '#C24141' },
  moreButton: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
  },
  moreButtonText: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  outlierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
  },
  outlierAmount: { fontSize: 15, fontWeight: '800', color: '#C24141' },
  outlierRatio: { marginTop: 2, fontSize: 13, fontWeight: '400', color: '#9CA3AF' },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#F8F5FF',
    borderWidth: 1,
    borderColor: '#E9DDFE',
  },
  patternTitle: { fontSize: 15, fontWeight: '700', color: '#4C1D95' },
  reflectiveTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  reflectiveTypeCount: { fontSize: 12, color: '#9CA3AF' },
  reflectiveMessage: { marginTop: 4, fontSize: 14, lineHeight: 20, color: '#374151' },
  reflectiveSummary: { alignItems: 'flex-end', justifyContent: 'center' },
  reflectiveSummaryAmount: { fontSize: 17, fontWeight: '800', color: '#111827' },
  patternDetailSummary: { marginTop: 10, fontSize: 20, fontWeight: '800', color: '#111827' },
  patternDetailHeading: { fontSize: 14, fontWeight: '800', color: '#4C1D95' },
  patternDetailText: { marginTop: 6, fontSize: 14, lineHeight: 21, color: '#374151' },
  patternTransactionList: { maxHeight: 300, marginTop: 6 },
  patternTransactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFF2',
  },
  patternTransactionAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },

  detailOverlay: { flex: 1, justifyContent: 'flex-end' },
  detailBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
  },
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  detailTitle: { fontSize: 19, fontWeight: '800', color: '#7C3AED' },
  detailCloseButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  detailCloseText: { fontSize: 28, lineHeight: 30, color: '#6B7280' },
  detailAmount: { marginTop: 8, fontSize: 30, fontWeight: '800', color: '#111827' },
  reflectiveDetailMessage: { marginTop: 8, fontSize: 16, lineHeight: 23, fontWeight: '700', color: '#4C1D95' },
  detailRatio: { marginTop: 3, fontSize: 14, fontWeight: '700', color: '#C24141' },
  detailDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  detailRow: { flexDirection: 'row', gap: 14, paddingVertical: 7 },
  detailLabel: { width: 74, fontSize: 14, fontWeight: '700', color: '#6B7280' },
  detailValue: { flex: 1, fontSize: 14, lineHeight: 20, color: '#1F2937', textAlign: 'right' },


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
