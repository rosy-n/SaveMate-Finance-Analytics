// app/(tabs)/_layout.tsx

import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { appBus } from '@/app/eventBus';
import { useAuth } from '@/state/AuthContext';
// import { SaveMateStyles as styles } from '@/styles/SaveMateStyles';

const BRAND = {
  // Figma의 활성 색상을 반영하여 마이페이지처럼 보라색 계열로 설정
  tint: '#7C3AED',        // 활성 탭 색 (라벤더/보라)
  inactive: '#9CA3AF',    // 비활성 라벨/아이콘 (회색)
  bg: '#FFFFFF',          // 탭바 배경
  border: 'rgba(0,0,0,0.06)',
};

export default function TabLayout() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  // 기기 하단 안전영역(제스처 바 등)을 포함해 탭바 높이를 계산한다.
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 8);

  // 로그인 확인 전에는 대기, 로그인하지 않았으면 로그인 화면으로 보낸다
  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: BRAND.tint,
        tabBarInactiveTintColor: BRAND.inactive,

        // 탭바 스타일은 이전 설정과 동일하게 유지합니다.
        tabBarStyle: {
          backgroundColor: BRAND.bg,
          borderTopColor: BRAND.border,
          height: 56 + bottomInset + 8,
          paddingBottom: bottomInset,
          paddingTop: 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
          elevation: 8,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          marginTop: 2,
          fontWeight: '600',
        },
        tabBarIconStyle: { marginTop: 0 },
        tabBarItemStyle: { paddingVertical: 0, justifyContent: 'center' },
      }}
    >
      {/* 1. 홈 탭 (home.tsx 파일 필요) */}
      <Tabs.Screen
        name="home" 
        options={{
          title: '홈', 
          tabBarIcon: ({ color }) => (
            // 집 모양 아이콘 (Figma와 유사)
            <IconSymbol size={24} name="house" color={color} />
          ),
        }}
        listeners={{
          tabPress: () => {
            // 홈 탭을 누를 때 SaveMateApp에 알림
            appBus.emit('homeTabPressed');
          },
        }}
      />

      {/* 2. 리포트 탭 */}
      <Tabs.Screen
        name="report" // report 폴더를 가리킵니다.
        options={{
          title: '리포트', // Figma 텍스트 반영
          tabBarIcon: ({ color }) => (
            // 문서 모양 아이콘 (Figma와 유사)
            <IconSymbol size={24} name="doc.text" color={color} />
          ),
        }}
      />
      
      {/* 3. 챌린지 탭 */}
      <Tabs.Screen
        name="challenge" // challenge 폴더
        options={{
          title: '챌린지', // Figma 텍스트 반영
          tabBarIcon: ({ color }) => (
            // 메달/리본 모양 아이콘 (Figma와 유사)
            <IconSymbol size={24} name="trophy" color={color} />
          ),
        }}
      />
      
      {/* 4. 마이페이지 탭 */}
      <Tabs.Screen
        name="mypage" // mypage 폴더 또는 mypage.tsx 파일
        options={{
          title: '마이페이지', // Figma 텍스트 반영
          tabBarIcon: ({ color }) => (
            // 사람 모양 아이콘 (Figma와 유사)
            <IconSymbol size={24} name="person" color={color} />
          ),
        }}
      />

      {/* explore 탭은 Figma에 없으므로 제거 */}
    </Tabs>
  );
}
