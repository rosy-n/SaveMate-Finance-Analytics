// SatisfactionRating.jsx
import React, { useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  StyleSheet
} from 'react-native';

const fmtMonthDayKR = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d || '';
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
};

const DEFAULT_REASON_OPTIONS = {
  dissatisfied: ['품질 불만', '가격 불만', '과소비 / 불필요', '경제적 / 사회적 압박', '감정 후회', '기타'],
  neutral: ['평범함', '일상적 / 습관적', '대안 없음', '기타'],
  satisfied: ['필요 충족', '감정 충족', '가성비 만족', '경험 / 성장', '사회적 유대', '기타'],
};

const DEFAULT_EVALUATION_DATA = {
  transactionId: 'txn_005',
  purchaseItem: '카페',
  amount: 15600,
  purchaseDate: '9월 14일',
  category: '카페',
};

export default function SatisfactionRating({
  styles,
  evaluationData: evaluationDataProp,
  reasonOptions: reasonOptionsProp,
  onBack,
  onSubmit,
}) {
  const evaluationData = evaluationDataProp ?? DEFAULT_EVALUATION_DATA;
  const reasonOptions = reasonOptionsProp ?? DEFAULT_REASON_OPTIONS;

  const [rating, setRating] = useState(null);
  const [selectedReasons, setSelectedReasons] = useState([]); // ⭐ 다중 선택 배열
  const [localMemo, setLocalMemo] = useState('');
  const scrollViewRef = useRef(null);
  const scrollYRef = useRef(0);

  const currentReasons = useMemo(
    () => (rating ? reasonOptions[rating] ?? [] : []),
    [rating, reasonOptions]
  );

  const handleScroll = (e) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  };

  const restoreScroll = () => {
    const y = scrollYRef.current || 0;
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y, animated: false });
    });
  };

  const handleRatingSelect = (next) => {
    setRating(next);
    setSelectedReasons([]); // ⭐ 다중 선택 초기화
    setLocalMemo('');
    restoreScroll();
  };

  // ⭐ 다중선택 토글
  const handleReasonSelect = (reason) => {
    setSelectedReasons((prev) => {
      if (prev.includes(reason)) {
        return prev.filter((r) => r !== reason); // 제거
      }
      return [...prev, reason]; // 추가
    });
    restoreScroll();
  };

  const submit = async () => {
    if (!rating) {
      Alert.alert('만족도 선택', '만족도(불만족/보통/만족) 중 하나를 선택해 주세요.');
      return;
    }

    if (selectedReasons.length === 0) {
      Alert.alert('이유 선택 필요', '이유를 1개 이상 선택해 주세요.');
      return;
    }

    Keyboard.dismiss();

    const payload = {
      transactionId: evaluationData.transactionId,
      emotion: rating,
      reason: selectedReasons, // ⭐ 배열로 전달
      memo: localMemo,
    };

    if (onSubmit) onSubmit(payload);
    else onBack?.();
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* 헤더 */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.detailTitle}>만족도 평가</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 본문 */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="always"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* 요약 카드 */}
          <View style={styles.card}>
            <Text style={styles.satisfactionQuestion}>
              {fmtMonthDayKR(evaluationData.purchaseDate)}의 ‘{evaluationData.purchaseItem}’ 지출은 어떠셨나요?
            </Text>
            <View style={styles.amountBox}>
              <Text style={styles.satisfactionAmount}>
                {typeof evaluationData.amount === 'number'
                  ? evaluationData.amount.toLocaleString('ko-KR') + '원'
                  : evaluationData.amount}
              </Text>
              <Text style={styles.satisfactionDate}>
                {fmtMonthDayKR(evaluationData.purchaseDate)} | {evaluationData.category}
              </Text>
            </View>
          </View>

          {/* 이모지 선택 */}
          <View style={styles.card}>
            <View style={styles.emojiRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.emojiButton,
                  rating === 'dissatisfied' && styles.emojiButtonSelected,
                  rating === 'dissatisfied' && styles.emojiButtonDissatisfied,
                ]}
                onPress={() => handleRatingSelect('dissatisfied')}
              >
                <Text style={styles.emojiIcon}>😡</Text>
                <Text style={styles.emojiLabel}>불만족</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.emojiButton,
                  rating === 'neutral' && styles.emojiButtonSelected,
                  rating === 'neutral' && styles.emojiButtonNeutral,
                ]}
                onPress={() => handleRatingSelect('neutral')}
              >
                <Text style={styles.emojiIcon}>😐</Text>
                <Text style={styles.emojiLabel}>보통</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.emojiButton,
                  rating === 'satisfied' && styles.emojiButtonSelected,
                  rating === 'satisfied' && styles.emojiButtonSatisfied,
                ]}
                onPress={() => handleRatingSelect('satisfied')}
              >
                <Text style={styles.emojiIcon}>😆</Text>
                <Text style={styles.emojiLabel}>만족</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 이유/메모 */}
          {!!rating && (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>어떤 이유인가요?</Text>

                <View style={[styles.reasonGrid, { justifyContent: 'space-between' }]}>
                  {currentReasons.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      activeOpacity={0.7}
                      style={[
                        styles.reasonChip,
                        { width: '48%', alignItems: 'center', justifyContent: 'center' },
                        selectedReasons.includes(reason) && styles.reasonChipSelected, // ⭐ 다중선택 표시
                      ]}
                      onPress={() => handleReasonSelect(reason)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          { textAlign: 'center' },
                          selectedReasons.includes(reason) && styles.reasonChipTextSelected, // ⭐ 다중선택 텍스트
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
                  value={localMemo}
                  onChangeText={setLocalMemo}
                  textAlignVertical="top"
                  autoCorrect={false}
                  autoCapitalize="none"
                  onFocus={() => {
                    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
                  }}
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => {
                    Keyboard.dismiss();
                    onBack?.();
                  }}
                >
                  <Text style={styles.btnSecondaryText}>다음에</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnPrimaryLarge} onPress={submit}>
                  <Text style={styles.btnPrimaryLargeText}>기록하기</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
