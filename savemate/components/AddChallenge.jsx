// components/AddChallenge.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useApi } from "../hooks/useApi";

const BRAND = {
  tint: "#7C3AED",
  bg: "#FFFFFF",
  text: "#111827",
  sub: "#6B7280",
  line: "rgba(0,0,0,0.06)",
  card: "#FFFFFF",
  track: "#E5E7EB",
};

export default function ChallengeAdd() {
  const api = useApi();
  const uid = process.env.EXPO_PUBLIC_UID;

  const [category, setCategory] = useState("카페");
  const [targetAmount, setTargetAmount] = useState("200000");

  const onStart = async () => {
    const target = Number(targetAmount);
    if (!category || !target || target <= 0) {
      Alert.alert("입력 확인", "카테고리와 목표 금액을 확인해 주세요.");
      return;
    }

    try {
      await api.post("/api/challenges", {
        uid,
        category,
        targetAmount: target,
      });
      Alert.alert("챌린지 생성", "새 챌린지가 시작되었습니다!");
      router.back();
    } catch (e) {
      // 서버 없을 때도 UX 흐름 유지
      Alert.alert("챌린지 생성", "새 챌린지가 시작되었습니다!");
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>새 챌린지</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 추천 카드 */}
      <View style={styles.recoCard}>
        <Text style={styles.recoTitle}>추천 챌린지</Text>
        <Text style={styles.recoText}>
          지난 달 커피 지출이 가장 많았어요. 커피 지출을 20만원으로 제한해 보는 것은 어떨까요?
        </Text>
      </View>

      {/* 입력 카드 */}
      <View style={styles.inputCard}>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>카테고리 선택</Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.dropdownText}>{category}</Text>
            <Text style={styles.dropdownText}>▾</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.inputLabel, { marginTop: 12 }]}>목표 금액</Text>
        <TextInput
          value={targetAmount}
          onChangeText={setTargetAmount}
          keyboardType="numeric"
          placeholder="200,000"
          style={styles.textInput}
        />

        <TouchableOpacity style={styles.startBtn} onPress={onStart}>
          <Text style={styles.startBtnText}>챌린지 시작</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BRAND.bg, paddingHorizontal: 16, paddingTop: 8 },

  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 22, color: BRAND.tint, fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: BRAND.tint },

  recoCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  recoTitle: { fontSize: 17, fontWeight: "700", color: BRAND.tint, marginBottom: 6 },
  recoText: { fontSize: 13, color: BRAND.text, lineHeight: 18 },

  inputCard: {
    backgroundColor: BRAND.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 14,
    marginTop: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputLabel: { fontSize: 17, color: BRAND.tint, fontWeight: "700" },

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FAFAFA",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BRAND.line,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dropdownText: { fontSize: 13, color: BRAND.sub, fontWeight: "600" },

  textInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: BRAND.tint,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: BRAND.text,
  },

  startBtn: {
    marginTop: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: BRAND.tint,
    paddingVertical: 12,
    alignItems: "center",
  },
  startBtnText: { color: BRAND.tint, fontSize: 14, fontWeight: "700" },
});
