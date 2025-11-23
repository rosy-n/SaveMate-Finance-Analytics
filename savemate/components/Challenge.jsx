import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SaveMateStyles as styles } from '../styles/SaveMateStyles';

const Challenge = () => {
  const navigation = useNavigation();
  const [dDay, setDDay] = useState(0);
  const [sortOption, setSortOption] = useState('위험도순');

  // 예시 더미 데이터
  const [challenges, setChallenges] = useState([
    {
      id: 1,
      title: '카페/간식 챌린지',
      progress: 73,
      amount: 146000,
      goal: 200000,
    },
    {
      id: 2,
      title: '식비 챌린지',
      progress: 125,
      amount: 250000,
      goal: 200000,
    },
    // 추가 챌린지 데이터...
  ]);

  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const remainingDays = lastDay - today.getDate() + 1;
    setDDay(remainingDays);
  }, []);

  const toggleSortOption = () => {
    setSortOption(prev => (prev === '위험도순' ? 'ㄱㄴㄷ순' : '위험도순'));
  };

  const goToNewChallenge = () => {
    navigation.navigate('NewChallenge');
  };

  const renderChallengeItem = (challenge) => {
    const progressWidth = Math.min(challenge.progress, 100);

    return (
      <TouchableOpacity
        style={styles.challengeItem}
        key={challenge.id}
        onPress={() => navigation.navigate('ChallengeDetail', { challenge })}
      >
        <View style={styles.challengeItemHeader}>
          <Text style={styles.challengeItemTitle}>{challenge.title}</Text>
          <TouchableOpacity style={styles.challengeItemMoreButton}>
            <Text style={styles.challengeItemMoreButtonText}>...</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.challengeItemProgress}>
          <Text style={styles.challengeItemPercentage}>{challenge.progress}%</Text>
          <View style={styles.challengeItemProgressBar}>
            <View style={[styles.challengeItemProgressFill, { width: `${progressWidth}%` }]} />
          </View>
        </View>
        <Text style={styles.challengeItemAmount}>
          {challenge.amount.toLocaleString()}원 / {challenge.goal.toLocaleString()}원
        </Text>
      </TouchableOpacity>
    );
  };
  
  // 진행 중인 챌린지와 실패한 챌린지 구분
  const ongoingChallenges = challenges.filter((challenge) => challenge.progress <= 100);
  const failedChallenges = challenges.filter((challenge) => challenge.progress > 100);

  return (
    <View style={styles.screen}>
      {/* 헤더 */}
      <View style={styles.challengeHeaderFix}>
        <View style={{ width: 40, height: 40 }} />

        <Text style={styles.challengeTitle}>챌린지</Text>

        <TouchableOpacity style={styles.addChallengeButton} onPress={goToNewChallenge}>
          <Text style={styles.addChallengeButtonText}>+</Text>
        </TouchableOpacity>
      </View>


      {/* 서브 헤더 */}
      <View style={styles.challengeSubheader}>
        <Text style={styles.challengeSubheaderText}>진행 중인 챌린지 (D-{dDay})</Text>
        <TouchableOpacity style={styles.sortButton} onPress={toggleSortOption}>
          <Text style={styles.sortButtonText}>{sortOption}</Text>
        </TouchableOpacity>
      </View>

      {/* 챌린지 리스트 */}
      <ScrollView style={styles.challengeList}>
        {/* 진행 중인 챌린지 */}
        {ongoingChallenges.map((challenge) => renderChallengeItem(challenge))}

        {/* 실패한 챌린지 */}
        {failedChallenges.length > 0 && (
          <>
            <Text style={styles.failedChallengeTitle}>실패한 챌린지</Text>
            {failedChallenges.map((challenge) => renderChallengeItem(challenge))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default Challenge;