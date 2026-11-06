// components/ChallengeDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useApi } from "../hooks/useApi";
import { getAppToday } from "../constants/appDate";
import { formatFailedOn, formatPeriod } from "../constants/challengeFormat";
import { SafeAreaView } from "react-native";

const BRAND = {
  tint: "#7C3AED",
  bg: "#FFFFFF",
  text: "#111827",
  sub: "#6B7280",
  line: "rgba(0,0,0,0.06)",
  card: "#FFFFFF",
  track: "#D1D5DB",
  trackLight: "#E5E7EB",
};

const PREVIEW_COUNT = 3;

const formatKRW = (n) =>
  (Number(n || 0)).toLocaleString("ko-KR") + "원";

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams();
  const api = useApi();
  const uid = process.env.EXPO_PUBLIC_UID;

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [givingUp, setGivingUp] = useState(false); // 포기 확인 팝업이 떠 있는 동안 버튼을 실패 색으로 표시

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadFailed(false);
        const res = await api.get(`/api/challenges/${id}?uid=${uid}&today=${getAppToday()}`);
        if (!mounted) return;
        setChallenge(res?.challenge);
        setMonthlyExpenses(res?.monthlyExpenses ?? []);
      } catch (e) {
        if (!mounted) return;
        setLoadFailed(true);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [api, id, uid]);

  const pctRaw = useMemo(() => {
    if (!challenge?.targetAmount) return 0;
    return Math.round((challenge.currentAmount / challenge.targetAmount) * 100);
  }, [challenge]);

  const pctForBar = Math.min(pctRaw, 100);
  const visibleExpenses = showAll ? monthlyExpenses : monthlyExpenses.slice(0, PREVIEW_COUNT);
  const remaining = Math.max(
    (challenge?.targetAmount ?? 0) - (challenge?.currentAmount ?? 0),
    0
  );

  const isEnded = challenge ? challenge.periodEnd < getAppToday() : false;

  const onGiveUp = async () => {
    setGivingUp(true);
    Alert.alert("챌린지 포기", "정말 포기하시겠어요?", [
      { text: "취소", style: "cancel", onPress: () => setGivingUp(false) },
      {
        text: "포기하기",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/api/challenges/${id}/giveup`, { uid, today: getAppToday() });
            router.back();
          } catch {
            setGivingUp(false);
            Alert.alert("챌린지 포기", "포기 처리에 실패했어요. 다시 시도해 주세요.");
          }
        },
      },
    ]);
  };

  if (!loading && (loadFailed || !challenge)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>챌린지 상세</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.emptyText}>챌린지를 불러오지 못했어요.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* 헤더 (시안처럼 상단 여백/중앙 타이틀) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>챌린지 상세</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 상단 진행률 영역 */}
        <View style={styles.topBox}>
          <Text style={styles.bigPct}>{pctRaw}%</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pctForBar}%` }]} />
          </View>

          <Text style={styles.amountLine}>
            {formatKRW(challenge.currentAmount)} / {formatKRW(challenge.targetAmount)}
          </Text>
          <Text style={styles.remainingLine}>
            남은 예산 : {formatKRW(remaining)}
          </Text>
          <Text style={styles.remainingLine}>
            기간 : {formatPeriod(challenge.periodStart, challenge.periodEnd)}
          </Text>
          {challenge.status === "failed" && (
            <Text style={styles.remainingLine}>{formatFailedOn(challenge)}</Text>
          )}
        </View>

        {/* 이번 달 지출 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isEnded ? "기간 내" : "이번 달"} {challenge.category} 지출
          </Text>

          {monthlyExpenses.length === 0 && (
            <Text style={styles.emptyText}>아직 지출 내역이 없어요.</Text>
          )}

          {visibleExpenses.map((e, index) => (
            <View
              key={e.id}
              style={[styles.expensePill, index < visibleExpenses.length - 1 && styles.expenseDivider]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.storeText} numberOfLines={1}>
                  {e.store}
                </Text>
                <Text style={styles.dateText}>{e.date}</Text>
              </View>
              <Text style={styles.amountText}>{formatKRW(e.amount)}</Text>
            </View>
          ))}

          {monthlyExpenses.length > PREVIEW_COUNT && (
            <TouchableOpacity
              style={styles.fullListBtn}
              activeOpacity={0.8}
              onPress={() => setShowAll((v) => !v)}
            >
              <Text style={styles.fullListBtnText}>
                {showAll ? "접기" : "전체 내역 보기"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 포기하기 버튼 (이미 끝난 챌린지에는 표시하지 않음) */}
        {!isEnded && (challenge.status === "active" || challenge.status === "failed") && (
          <TouchableOpacity
            style={[styles.giveUpBtn, givingUp && styles.giveUpBtnActive]}
            onPress={onGiveUp}
            activeOpacity={0.85}
          >
            <Text style={[styles.giveUpBtnText, givingUp && styles.giveUpBtnTextActive]}>포기하기</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.bg },

  emptyText: {
    fontSize: 13,
    color: BRAND.sub,
    textAlign: "center",
    paddingVertical: 16,
  },

  screen: { flex: 1, backgroundColor: BRAND.bg },

  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BRAND.bg,
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 24,
    color: BRAND.tint,
    fontWeight: "800",
    includeFontPadding: false,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: BRAND.tint,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },

  topBox: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 18,
  },
  bigPct: {
    fontSize: 28,
    fontWeight: "800",
    color: BRAND.text,
    marginBottom: 14,
  },

  progressTrack: {
    width: "100%",
    height: 14,                 // 시안처럼 두껍게
    backgroundColor: BRAND.trackLight,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: BRAND.tint,
    borderRadius: 999,
  },

  amountLine: {
    marginTop: 14,
    fontSize: 14,
    color: BRAND.text,
    fontWeight: "700",
  },
  remainingLine: {
    marginTop: 6,
    fontSize: 13,
    color: BRAND.sub,
    fontWeight: "600",
  },

  card: {
    backgroundColor: BRAND.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.line,
    padding: 14,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: BRAND.tint,
    marginBottom: 10,
  },

  // 리포트 탭의 '관련 지출 내역'과 같은 형태의 지출 row
  expensePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
  },
  expenseDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFF2",
  },
  storeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  dateText: {
    fontSize: 12,
    color: "#8a8f9c",
    marginTop: 3,
  },
  amountText: {
    fontSize: 15,
    fontWeight: "700",
    color: BRAND.text,
  },

  fullListBtn: {
    marginTop: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  fullListBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: BRAND.sub,
    textDecorationLine: "underline",
  },

  giveUpBtn: {
    marginTop: 14,
    alignSelf: "center",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 28,
    alignItems: "center",
    backgroundColor: BRAND.bg,
  },
  giveUpBtnActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FEE2E2",
  },
  giveUpBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  giveUpBtnTextActive: {
    color: "#DC2626",
  },
});
