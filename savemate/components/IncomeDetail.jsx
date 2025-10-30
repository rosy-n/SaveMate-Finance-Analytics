// components/IncomeRecord.jsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export default function IncomeRecord({ onBack, onSubmit }) {
  const [incomeText, setIncomeText] = useState('');
  const [incomeMethod, setIncomeMethod] = useState(null); // '월급' | '용돈' | '기타'

  const handleSubmit = () => {
    if (!incomeText || !incomeMethod) {
      alert('수입 내역과 수입 수단을 모두 입력해 주세요.');
      return;
    }
    onSubmit?.({ incomeText, incomeMethod });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>수입 기록</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 폼 */}
      <View style={styles.form}>
        <Text style={styles.label}>수입 내역</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 아르바이트 급여"
          value={incomeText}
          onChangeText={setIncomeText}
        />

        <Text style={[styles.label, { marginTop: 24 }]}>수입 수단</Text>
        <View style={styles.methodContainer}>
          {['월급', '용돈', '기타'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.methodBtn, incomeMethod === m && styles.methodBtnActive]}
              onPress={() => setIncomeMethod(m)}
            >
              <Text
                style={[styles.methodText, incomeMethod === m && styles.methodTextActive]}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>다음</Text>
        </TouchableOpacity>
      </View>
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
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    padding: 12, fontSize: 16,
  },
  methodContainer: { flexDirection: 'row', gap: 8 },
  methodBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  methodBtnActive: { backgroundColor: '#C7D2FE' },
  methodText: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  methodTextActive: { color: '#1E3A8A', fontWeight: '700' },
  submitBtn: {
    backgroundColor: '#7C3AED', marginTop: 40, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
