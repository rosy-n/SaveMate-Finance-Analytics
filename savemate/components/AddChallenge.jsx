import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SaveMateStyles as styles } from '../styles/SaveMateStyles';

const AddChallenge = () => {
  return (
    <View style={styles.screen}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>새 챌린지 추가</Text>
      </View>

      {/* 새 챌린지 추가 내용 */}
      <View style={styles.content}>
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
        <TouchableOpacity style={styles.addChallengeConfirmButton}>
          <Text style={styles.addChallengeConfirmButtonText}>챌린지 추가</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AddChallenge;