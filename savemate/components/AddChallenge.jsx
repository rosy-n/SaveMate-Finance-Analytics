// components/AddChallenge.jsx

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SaveMateStyles as styles } from '../styles/SaveMateStyles';

// props로 onClose 함수를 명시적으로 받도록 수정
const AddChallenge = ({ onClose }) => { 
    
  const handleConfirm = () => {
    // 챌린지 추가 로직 실행...
    // 완료 후 모달 닫기
    if (onClose) {
        onClose();
    }
  };

  return (
    <View style={styles.screen}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>새 챌린지 추가</Text>
        {/* 닫기 버튼 추가 */}
        <TouchableOpacity 
            onPress={onClose} 
            style={{ position: 'absolute', right: 20, padding: 5 }}
        >
            <Text style={{ fontSize: 20, color: '#7C3AED' }}>X</Text>
        </TouchableOpacity>
      </View>

      {/* 새 챌린지 추가 내용 */}
      <ScrollView style={styles.content}>
        {/* 챌린지 제목 입력 */}
        <TextInput
          style={styles.challengeTitleInput}
          placeholder="챌린지 제목을 입력하세요"
        />

        {/* 챌린지 금액 입력 */}
        <TextInput
          style={styles.challengeAmountInput}
          placeholder="챌린지 금액을 입력하세요"
          keyboardType="numeric"
        />

        {/* 챌린지 기간 입력 */}
        <View style={styles.challengePeriodInputContainer}>
          <TextInput
            style={styles.challengePeriodInput}
            placeholder="시작일"
          />
          <Text style={styles.challengePeriodSeparator}>-</Text>
          <TextInput
            style={styles.challengePeriodInput}
            placeholder="종료일"
          />
        </View>

        {/* 챌린지 추가 버튼 */}
        <TouchableOpacity 
          style={styles.addChallengeConfirmButton}
          onPress={handleConfirm} // 추가 후 onClose 호출
        >
          <Text style={styles.addChallengeConfirmButtonText}>챌린지 추가</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default AddChallenge;