import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SaveMateStyles as styles } from '../styles/SaveMateStyles';

const ChallengeDetail = ({ route }) => {
  const navigation = useNavigation();
  const { challenge } = route.params;

  return (
    <View style={styles.screen}>
      {/* 헤더 */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.detailTitle}>챌린지 상세</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 챌린지 상세 내용 */}
      <View style={styles.content}>
        {/* 챌린지 제목 */}
        <Text style={styles.challengeTitle}>{challenge.title}</Text>

        {/* 프로그레스 바 */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(challenge.progress, 100)}%` }]} />
        </View>

        {/* 챌린지 상세 정보 */}
        <View style={styles.challengeDetails}>
          <Text style={styles.challengeAmount}>
            {challenge.amount.toLocaleString()}원 / {challenge.goal.toLocaleString()}원
          </Text>
          <Text style={styles.challengePeriod}>2023년 5월 1일 - 5월 31일</Text>
        </View>
      </View>
    </View>
  );
};

export default ChallengeDetail;