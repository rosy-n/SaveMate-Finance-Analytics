// components/ChallengeHome.jsx

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router'; // <--- 라우터 임포트 추가
import { SaveMateStyles as styles } from '../styles/SaveMateStyles';

// ChallengeHomeRoute.tsx에서 전달하는 props는 사용하지 않습니다. 
// 컴포넌트 내에서 직접 router를 사용합니다.
const Challenge = () => {
  const [dDay, setDDay] = useState(0);
  const [sortOption, setSortOption] = useState('위험도순');

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

  // 새 챌린지 생성 페이지로 이동
  const handleAddPress = () => {
    router.push('/challenge/add'); 
  };
  
  // 챌린지 상세 페이지로 이동
  const handleDetailPress = (id) => {
    router.push(`/challenge/${id}`);
  };

  return (
    <View style={styles.screen}>
      {/* 헤더 */}
      <View style={styles.challengeHeader}>
        <Text style={styles.challengeTitle}>챌린지</Text>
        {/* + 버튼 클릭 시 새 챌린지 화면으로 이동 */}
        <TouchableOpacity 
          style={styles.addChallengeButton}
          onPress={handleAddPress} 
        >
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
        
        {/* 진행 중인 챌린지 아이템 - 클릭 시 상세 이동 */}
        <TouchableOpacity 
          style={styles.challengeItem}
          onPress={() => handleDetailPress(42)} // 임시 ID 42 사용
        >
          <View style={styles.challengeItemProgress}>
            <Text style={styles.challengeItemTitle}>카페/간식 챌린지</Text>
            <View style={styles.challengeItemProgressBar}>
              <View style={[styles.challengeItemProgressFill, { width: '73%' }]} />
            </View>
            <Text style={styles.challengeItemProgressText}>146,000원 / 200,000원</Text>
          </View>
          <Text style={styles.challengeItemPercentage}>73%</Text>
          <TouchableOpacity style={styles.challengeItemMoreButton}>
            <Text>...</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* 추가 챌린지 아이템 - 클릭 시 상세 이동 */}
        <TouchableOpacity 
          style={styles.challengeItem}
          onPress={() => handleDetailPress(43)} // 임시 ID 43 사용
        >
          <View style={styles.challengeItemProgress}>
            <Text style={styles.challengeItemTitle}>식비 챌린지</Text>
            <View style={styles.challengeItemProgressBar}>
              <View style={[styles.challengeItemProgressFill, { width: '100%' }]} />
            </View>
            <Text style={styles.challengeItemProgressText}>250,000원 / 200,000원</Text>
          </View>
          <Text style={styles.challengeItemPercentage}>125%</Text>
          <TouchableOpacity style={styles.challengeItemMoreButton}>
            <Text>...</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default Challenge;