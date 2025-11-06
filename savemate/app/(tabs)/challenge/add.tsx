// app/(tabs)/challenge/add.tsx

import React from 'react';
import { router } from 'expo-router';
import AddChallenge from '../../../components/AddChallenge';

// AddChallenge 컴포넌트에 router 기능을 주입하는 래퍼
const AddChallengeWithRouter = () => {
    // 챌린지 추가 완료 또는 취소 후 홈으로 돌아가는 함수
    const handleClose = () => {
        router.back(); 
    };
    
    // ⚠️ AddChallenge.jsx 컴포넌트 내에 닫기 버튼/로직을 추가하고 
    // 이 handleClose 함수와 연결해야 모달이 닫힙니다.
    return <AddChallenge onClose={handleClose} />;
};

export default function AddChallengeRoute() {
    return <AddChallengeWithRouter />;
}