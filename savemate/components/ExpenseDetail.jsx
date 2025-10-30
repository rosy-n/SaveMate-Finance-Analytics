// components/ExpenseDetail.jsx
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';

const METHODS = ['현금', '신용카드', '체크카드'];

const CATEGORIES = [
  '식비', '카페/간식', '생활(마트 잡화)', '술/유흥', '패션/쇼핑',
  '뷰티/미용', '문화/여가', '의료/건강', '공과금(주거/세금/통신/보험)',
  '교통/자동차', '여행/숙박', '교육', '경조/선물/후원', '카드대금(후불)', '투자/저축',
];

const BACKGROUNDS = [
  '필수/생존', '사회/관계', '자아실현/자기계발',
  '쾌락/감정', '여가', '자기표현/이미지·SNS', '투자(저축)/미래지향',
];

export default function ExpenseDetail({
  onBack,
  onSubmit,
  amount,   // 선택: 금액 표시용
  date,     // 선택: 날짜 표시용 (Date 객체)
}) {
  const [memo, setMemo] = useState('');                    // 소비 내역(텍스트)
  const [method, setMethod] = useState(null);              // 지출 수단
  const [category, setCategory] = useState(null);          // 소비 품목
  const [background, setBackground] = useState(null);      // 소비 배경

  const [openCategory, setOpenCategory] = useState(false);     // 드롭다운(모달)
  const [openBackground, setOpenBackground] = useState(false); // 드롭다운(모달)

  const dateLabel = useMemo(() => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
  }, [date]);

  const canSubmit = memo.trim() && method && category && background;

  const handleSubmit = () => {
    if (!canSubmit) {
      alert('소비 내역, 지출 수단, 소비 품목, 소비 배경을 모두 입력해 주세요.');
      return;
    }
    onSubmit?.({
      memo: memo.trim(),
      method,
      category,
      background,
      amount,
      date: date?.toISOString?.() ?? null,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>소비 기록</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        {/* 선택 요약(선택) */}
        {(amount || date) && (
          <View style={styles.summaryCard}>
            {!!amount && <Text style={styles.summaryAmount}>{Number(amount).toLocaleString('ko-KR')}원</Text>}
            {!!date && <Text style={styles.summaryDate}>{dateLabel}</Text>}
          </View>
        )}

        {/* 소비 내역 */}
        <Text style={styles.label}>소비 내역</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 점심 식사(직장 근처 식당)"
          value={memo}
          onChangeText={setMemo}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* 지출 수단 */}
        <Text style={[styles.label, { marginTop: 24 }]}>지출 수단</Text>
        <View style={styles.methodRow}>
          {METHODS.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.methodBtn, method === m && styles.methodBtnActive]}
              onPress={() => setMethod(m)}
              activeOpacity={0.8}
            >
              <Text style={[styles.methodText, method === m && styles.methodTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 소비 품목 (드롭다운) */}
        <Text style={[styles.label, { marginTop: 24 }]}>소비 품목</Text>
        <TouchableOpacity style={styles.selectBox} onPress={() => setOpenCategory(true)}>
          <Text style={[styles.selectText, !category && styles.placeholder]}>
            {category ?? '선택하세요'}
          </Text>
          <Text style={styles.chev}>▾</Text>
        </TouchableOpacity>

        {/* 소비 배경 (드롭다운) */}
        <Text style={[styles.label, { marginTop: 24 }]}>소비 배경</Text>
        <TouchableOpacity style={styles.selectBox} onPress={() => setOpenBackground(true)}>
          <Text style={[styles.selectText, !background && styles.placeholder]}>
            {background ?? '선택하세요'}
          </Text>
          <Text style={styles.chev}>▾</Text>
        </TouchableOpacity>

        {/* 하단 버튼 */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>기록하기</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 카테고리 선택 모달 */}
      <Modal
        visible={openCategory}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenCategory(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpenCategory(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>소비 품목 선택</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {CATEGORIES.map(item => (
                <TouchableOpacity
                  key={item}
                  style={styles.modalItem}
                  onPress={() => { setCategory(item); setOpenCategory(false); }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 소비 배경 선택 모달 */}
      <Modal
        visible={openBackground}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenBackground(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpenBackground(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>소비 배경 선택</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {BACKGROUNDS.map(item => (
                <TouchableOpacity
                  key={item}
                  style={styles.modalItem}
                  onPress={() => { setBackground(item); setOpenBackground(false); }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  backChevron: { fontSize: 28, color: '#7C3AED' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#7C3AED' },

  form: { padding: 24 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#111827' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 16, backgroundColor: '#FFFFFF',
  },

  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  methodBtnActive: { backgroundColor: '#C7D2FE' },
  methodText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  methodTextActive: { color: '#1E3A8A', fontWeight: '700' },

  selectBox: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectText: { fontSize: 16, color: '#111827' },
  placeholder: { color: '#9CA3AF' },
  chev: { fontSize: 16, color: '#6B7280' },

  submitBtn: {
    backgroundColor: '#7C3AED', marginTop: 32, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  summaryCard: {
    marginBottom: 20, padding: 14, borderRadius: 12,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  summaryAmount: { fontSize: 18, fontWeight: '700', color: '#111827' },
  summaryDate: { marginTop: 4, fontSize: 13, color: '#6B7280' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#111827' },
  modalItem: { paddingVertical: 12 },
  modalItemText: { fontSize: 16, color: '#111827' },
});
