// 리포트탭 안에 있는 여러 탭들의 레이아웃 정의
import { Stack } from 'expo-router';

export default function ReportStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="default" />
      <Stack.Screen name="consumption" />
      <Stack.Screen name="satisfaction" />
      <Stack.Screen name="regret" />
    </Stack>
  );
}
