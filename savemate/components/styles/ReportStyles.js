// components/styles/ReportStyles.js
import { StyleSheet } from 'react-native';

export const ReportStyles = StyleSheet.create({
  // 공통 레이아웃
  screen: { flex: 1, backgroundColor: '#F7F7FA' },
  header: { backgroundColor: '#F7F7FA', paddingVertical: 15, alignItems: 'center' },
  appTitle: { fontSize: 22, fontWeight: '800', color: '#7C3AED' },

  content: { paddingHorizontal: 16, paddingBottom: 32 },

  sectionNavWrap: {
    backgroundColor: '#F7F7FA',
    paddingVertical: 9,
    zIndex: 20,
  },
  sectionNav: { gap: 8, paddingRight: 8 },
  sectionNavButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3EC',
  },
  sectionNavButtonActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  sectionNavText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  sectionNavTextActive: { color: '#FFFFFF' },

  // 카드
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ECE8F1',
    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },

  // 텍스트
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#7C3AED' },
  cardText: { fontSize: 14, lineHeight: 20, color: '#4B5563' },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#25212D' },
  caption: { fontSize: 12, lineHeight: 17, color: '#8B8495' },
  totalAmountSm: { fontSize: 16, fontWeight: '800', color: '#25212D' },
  totalAmount: { fontSize: 28, fontWeight: '800', color: '#17131D' },

  // AI 소비 리포트
  aiReportCard: {
    borderWidth: 1,
    borderColor: '#ECE8F1',
  },
  aiSummaryCard: {
    backgroundColor: '#FCFAFF',
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  aiBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#EDE4FF',
  },
  aiBadgeText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  aiDescription: { marginTop: 5, fontSize: 12, lineHeight: 18, color: '#8A7FA3' },
  aiPersona: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#3B2463',
  },
  aiSummaryText: { marginTop: 7, fontSize: 14, lineHeight: 20, color: '#4B5563' },
  aiInsightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FAF8FF',
    borderWidth: 1,
    borderColor: '#F0EDF3',
  },
  aiBullet: {
    width: 7,
    height: 7,
    marginTop: 6,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
  },
  aiInsightText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#374151' },
  aiSubsectionTitle: {
    marginTop: 10,
    marginBottom: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#5B21B6',
  },
  aiBulletDissatisfied: { backgroundColor: '#E58B8B' },
  aiBulletNeutral: { backgroundColor: '#E7B963' },
  aiBulletSatisfied: { backgroundColor: '#78BF72' },

  // 차트/리스트
  chartWrap: { alignItems: 'center', marginTop: 10 },
  catRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDF3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },

  itemRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F0EDF3' },

  metricBox: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#F8F5FF',
    borderWidth: 1,
    borderColor: '#EDE5FD',
  },
  metricLabel: { fontSize: 13, fontWeight: '600', color: '#6D5A91' },
  metricValue: { fontSize: 28, fontWeight: '800', color: '#7C3AED', marginVertical: 3 },
  metricInsight: { fontSize: 16, lineHeight: 23, fontWeight: '700', color: '#4C1D95', marginTop: 6 },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#F0EDF3',
    borderRadius: 10,
    backgroundColor: '#FAF9FC',
  },
  analyticsScore: { fontSize: 16, fontWeight: '800', color: '#3F8A49' },
  efficiencyWorstScore: { fontSize: 16, fontWeight: '800', color: '#B65E5E' },
  efficiencyGroupTitle: {
    marginTop: 14,
    marginBottom: 2,
    fontSize: 13,
    fontWeight: '800',
    color: '#7C3AED',
  },
  efficiencyBestTitle: { color: '#3F8A49' },
  efficiencyWorstTitle: { color: '#B65E5E' },
  statusDotPositive: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#69B873' },
  statusDotNegative: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#D98282' },
  statusDotCaution: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#D9A441' },
  statusDotReview: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#C87864' },
  moreButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#F3EEFC',
    borderWidth: 1,
    borderColor: '#E6D9FA',
  },
  moreButtonText: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  outlierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#F0EDF3',
  },
  outlierAmount: { fontSize: 15, fontWeight: '800', color: '#25212D' },
  outlierRatio: { marginTop: 2, fontSize: 13, fontWeight: '400', color: '#9CA3AF' },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#FAF9FC',
    borderWidth: 1,
    borderColor: '#F0EDF3',
  },
  patternTitle: { fontSize: 15, fontWeight: '700', color: '#25212D' },
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
    borderBottomColor: '#F0EDF3',
  },
  patternTransactionAmount: { fontSize: 15, fontWeight: '700', color: '#111827' },

  detailOverlay: { flex: 1, justifyContent: 'flex-end' },
  detailBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(24, 18, 32, 0.42)',
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
  detailDivider: { height: 1, backgroundColor: '#ECE8F1', marginVertical: 14 },
  detailRow: { flexDirection: 'row', gap: 14, paddingVertical: 7 },
  detailLabel: { width: 74, fontSize: 14, fontWeight: '700', color: '#6B7280' },
  detailValue: { flex: 1, fontSize: 14, lineHeight: 20, color: '#1F2937', textAlign: 'right' },


  // 지출배경별 만족도 막대 그래프 스타일
  bgBlock: {
    marginBottom: 17,
  },
  bgLabel: {
    fontSize: 14,
    color: '#4B4552',
    fontWeight: '600',
    marginBottom: 6,
  },
  bgBarWrap: {
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#F0EDF3',
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
    color: '#5F5966',
    fontWeight: '600',
  },

  bgLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  bgLegendItem: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  bgLegendD: { color: '#F4A7A7' },
  bgLegendN: { color: '#F7D8A4' },
  bgLegendS: { color: '#BFF8AA' },


  // 이번달 지출 worst 3 스타일
  worstRow: {
    flexDirection: 'row',
    alignItems: 'center',   
    minHeight: 64,
  },

  worstRank: {
    fontSize: 22,
    fontWeight: '800',
    color: '#7C3AED',
    width: 22,
    textAlign: 'center',
  },

  worstLeft: {
    flex: 0.9,           
    paddingLeft: 10,
  },

  worstRight: {
    flex: 1.4,           
    paddingLeft: 10,
  },

  worstTitle: {
    fontSize: 15,        
    fontWeight: '700',
    color: '#5B21B6',
    marginBottom: 3,
  },

  worstSub: {
    fontSize: 12,        
    color: '#756E7D',
    marginTop: 1,
  },

  worstContainer: {
    borderWidth: 1,
    borderColor: '#F0EDF3',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 11,
    marginTop: 6,
    backgroundColor: '#FAF9FC',
  },
  worstDate: {
    fontSize: 12,    
    color: '#8B8495',
    marginBottom: 4,
  },
  worstAmount: {
    fontSize: 20,    
    fontWeight: '800',
    color: '#25212D',
  },
  highlightText: {
    fontWeight: '700',
  },

  highlightText1: {
    fontWeight: '700',
  },
  highlightText2: {
    fontWeight: '700',
  },
  highlightText3: {
    fontWeight: '700',
  },
});
