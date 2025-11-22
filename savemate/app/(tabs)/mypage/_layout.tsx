import { Stack } from "expo-router";

export default function MyPageLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // 지금 만든 커스텀 헤더 쓰려면 false
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="satisfactionAlarm" />
      <Stack.Screen name="pastChallenges" />
      <Stack.Screen name="faq" />
      <Stack.Screen name="feedback" />
    </Stack>
  );
}
