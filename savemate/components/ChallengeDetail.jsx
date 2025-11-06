// components/ChallengeDetail.jsx

import React from 'react';
import { View, Text } from 'react-native';
import { SaveMateStyles as styles } from '../styles/SaveMateStyles';

// props로 challengeId를 명시적으로 받도록 수정
const ChallengeDetail = ({ challengeId }) => { 
  
  // challengeId를 사용하여 데이터를 표시
  const id = challengeId || 'N/A'; 
  
  return (
    <View style={styles.screen}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>챌린지 상세</Text>
      </View>

      {/* 챌린지 상세 내용 */}
      <View style={styles.content}>
        {/* 챌린지 제목: ID 표시 추가 */}
        <Text style={styles.challengeTitle}>카페 챌린지 (ID: {id})</Text>

        {/* 프로그레스 바 */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '73%' }]} />
        </View>

        {/* 챌린지 상세 정보 */}
        <View style={styles.challengeDetails}>
          <Text style={styles.challengeAmount}>140,000원 / 200,000원</Text>
          <Text style={styles.challengePeriod}>2023년 5월 1일 - 5월 31일</Text>
        </View>
        
        {/* TODO: 챌린지 기록, 인증 버튼 등 추가 */}
      </View>
    </View>
  );
};

export default ChallengeDetail;