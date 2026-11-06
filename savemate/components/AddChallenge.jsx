// components/AddChallenge.jsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../state/AuthContext";
import { getAppToday } from "../constants/appDate";
import { formatChallengeRange } from "../constants/challengeFormat";

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
  const { user } = useAuth();
  const uid = user?.id;

  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [categoryRes, recoRes] = await Promise.allSettled([
        api.get("/api/challenges/categories"),
        api.get(`/api/challenges/recommendation?uid=${uid}&today=${getAppToday()}`),
      ]);
      if (!mounted) return;

      const list = categoryRes.value?.categories ?? [];
      const reco = recoRes.value?.recommendation ?? null;
      setCategories(list);
      setRecommendation(reco);
      // 추천이 있으면 입력칸을 추천값으로 미리 채운다.
      setCategory((prev) => prev || reco?.category || list[0] || "");
      if (reco) setTargetAmount((prev) => prev || String(reco.targetAmount));
    })();
    return () => {
      mounted = false;
    };
  }, [api, uid]);

  const onStart = async () => {
    const target = Number(targetAmount);
    if (!category || !Number.isInteger(target) || target <= 0) {
      Alert.alert("입력 확인", "카테고리와 목표 금액을 확인해 주세요.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      await api.post("/api/challenges", {
        uid,
        category,
        targetAmount: target,
        today: getAppToday(),
      });
      Alert.alert("챌린지 생성", "새 챌린지가 시작되었습니다!");
      router.back();
    } catch (e) {
      Alert.alert(
        "챌린지 생성",
        e?.message === "HTTP 409"
          ? "이 카테고리는 이미 진행 중인 챌린지가 있어요."
          : "챌린지를 만들지 못했어요. 다시 시도해 주세요."
      );
    } finally {
      setSubmitting(false);
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
          {recommendation
            ? `지난 달 ${recommendation.category} 지출이 ${recommendation.lastMonthTotal.toLocaleString("ko-KR")}원이었어요. 이번 달 남은 ${recommendation.remainingDays}일 동안 ${recommendation.category} 지출을 ${recommendation.targetAmount / 10000}만원으로 제한해 보는 것은 어떨까요?`
            : "추천할 지난 달 지출 내역이 없어요. 줄이고 싶은 카테고리와 목표 금액을 직접 정해 보세요."}
        </Text>
      </View>

      {/* 입력 카드 */}
      <View style={styles.inputCard}>
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>카테고리 선택</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setPickerOpen(true)}>
            <Text style={styles.dropdownText}>{category || "선택"}</Text>
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

        <Text style={styles.periodText}>{formatChallengeRange(getAppToday())}</Text>

        <TouchableOpacity style={styles.startBtn} onPress={onStart}>
          <Text style={styles.startBtnText}>챌린지 시작</Text>
        </TouchableOpacity>
      </View>

      {/* 카테고리 선택 */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerOpen(false)}
        >
          <View style={styles.pickerCard} onStartShouldSetResponder={() => true}>
            <ScrollView>
              {categories.length === 0 && (
                <Text style={styles.pickerItemText}>카테고리를 불러오지 못했어요.</Text>
              )}
              {categories.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.pickerItem}
                  onPress={() => {
                    setCategory(name);
                    setPickerOpen(false);
                  }}
                >
                  <Text
                    style={[styles.pickerItemText, name === category && styles.pickerItemSelected]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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

  periodText: { marginTop: 12, fontSize: 13, color: BRAND.sub },

  startBtn: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: BRAND.tint,
    paddingVertical: 12,
    alignItems: "center",
  },
  startBtnText: { color: BRAND.tint, fontSize: 14, fontWeight: "700" },

  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  pickerCard: {
    backgroundColor: BRAND.card,
    borderRadius: 14,
    paddingVertical: 6,
    maxHeight: "70%",
  },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 12 },
  pickerItemText: { fontSize: 14, color: BRAND.text },
  pickerItemSelected: { color: BRAND.tint, fontWeight: "700" },
});
