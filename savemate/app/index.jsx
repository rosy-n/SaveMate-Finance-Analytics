// app/index.jsx
import React from 'react';
import { View, Text } from 'react-native';
import { Link } from 'expo-router';

function Index() {
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
        SaveMate Dev Menu
      </Text>
      <Link href="/test-firestore" style={{ fontSize: 18, textDecorationLine: 'underline' }}>
        ➜ Firestore 테스트로 이동
      </Link>
    </View>
  );
}

export default Index;
