// app/(tabs)/challenge/[id].tsx

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ChallengeDetail from '../../../components/ChallengeDetail'; 

const ChallengeDetailWithParams = () => {
    // URL 파라미터(id)를 추출합니다.
    const params = useLocalSearchParams();
    // ID가 항상 문자열임을 보장하여 타입 오류를 방지합니다.
    const challengeId = params.id as string; 
    
    return (
        // ChallengeDetail 컴포넌트에 ID를 props로 전달합니다.
        // ⚠️ ChallengeDetail.jsx 파일이 이 props(challengeId)를 받도록 수정되어야 합니다.
        <ChallengeDetail challengeId={challengeId} />
    );
};

export default function ChallengeDetailRoute() {
    return <ChallengeDetailWithParams />;
}