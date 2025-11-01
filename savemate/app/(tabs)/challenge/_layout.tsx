// app/(tabs)/challenge/_layout.tsx

import { Stack } from 'expo-router';
import React from 'react';

export default function ChallengeStackLayout() {
  return (
    <Stack>
      {/* index.tsx (챌린지 홈): 기본 화면. 하단 탭과 겹치지 않도록 헤더를 숨깁니다. */}
      <Stack.Screen 
        name="index" 
        options={{ 
          title: '챌린지 홈', 
          headerShown: false,
        }} 
      />
      
      {/* new.tsx (새 챌린지): 모달 형태로 표시하여 생성을 강조합니다. */}
      <Stack.Screen 
        name="add" 
        options={{ 
          title: '새 챌린지',
          presentation: 'modal',
          headerShown: false, // AddChallenge.jsx 컴포넌트 내부에 헤더가 포함되어 있어 숨김
        }} 
      />

      {/* [id].tsx (챌린지 상세): 일반적인 Stack 화면 전환입니다. */}
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: '챌린지 상세',
          headerShown: false, // ChallengeDetail.jsx 컴포넌트 내부에 헤더가 포함되어 있어 숨김
        }} 
      />
    </Stack>
  );
}
