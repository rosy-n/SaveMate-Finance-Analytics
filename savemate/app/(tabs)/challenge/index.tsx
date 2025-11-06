// app/(tabs)/challenge/index.tsx
// 챌린지 홈 메인. ChallengeHome 컴포넌트를 래핑하는 코드를 제거하고 단순화합니다.

import React from 'react';
import { Stack } from 'expo-router';

// ChallengeHome 컴포넌트를 올바른 경로로 불러옵니다.
import ChallengeHome from '../../../components/ChallengeHome'; 

export default function ChallengeHomeRoute() {
  return (
    <>
      {/* Stack.Screen 옵션을 설정합니다. */}
      <Stack.Screen options={{ title: '챌린지 홈', headerShown: false }} /> 
      
      {/* 챌린지 홈 컴포넌트를 props 없이 그대로 렌더링합니다. 
          ChallengeHome.jsx 파일 내에서 router를 직접 사용하도록 수정했기 때문에
          이 라우팅 파일에서는 더 이상 props를 전달할 필요가 없습니다.
      */}
      <ChallengeHome />
    </>
  );
}