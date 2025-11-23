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
  pillBorder: "#D8B4FE", // 연보라 테두리
};

const formatKRW = (n) =>
  (Number(n || 0)).toLocaleString("ko-KR") + "원";

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams();
  const api = useApi();
  const uid = process.env.EXPO_PUBLIC_UID;

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/challenges/${id}?uid=${uid}`);
        if (!mounted) return;
        setChallenge(res?.challenge);
        setMonthlyExpenses(res?.monthlyExpenses ?? []);
      } catch (e) {
        if (!mounted) return;
        // 더미
        setChallenge({
          id,
          title: "카페/간식 챌린지",
          category: "카페",
          targetAmount: 200000,
          currentAmount: 146000,
        });
        setMonthlyExpenses([
          { id: "1", store: "스타벅스 프라푸치노", date: "2025.09.16", amount: 6500 },
          { id: "2", store: "투썸 플레이스 라떼", date: "2025.09.14", amount: 5800 },
          { id: "3", store: "투썸 플레이스 라떼", date: "2025.09.14", amount: 5800 },
        ]);
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
  const remaining = Math.max(
    (challenge?.targetAmount ?? 0) - (challenge?.currentAmount ?? 0),
    0
  );

  const onGiveUp = async () => {
    Alert.alert("챌린지 포기", "정말 포기하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "포기하기",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/api/challenges/${id}/giveup`, { uid });
          } catch {}
          router.back();
        },
      },
    ]);
  };

  if (loading || !challenge) {
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
        </View>

        {/* 이번 달 지출 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            이번 달 {challenge.category} 지출
          </Text>

          {monthlyExpenses.map((e) => (
            <View key={e.id} style={styles.expensePill}>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeText} numberOfLines={1}>
                  {e.store}
                </Text>
                <Text style={styles.dateText}>{e.date}</Text>
              </View>
              <Text style={styles.amountText}>{formatKRW(e.amount)}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.fullListBtn} activeOpacity={0.8}>
            <Text style={styles.fullListBtnText}>전체 내역 보기</Text>
          </TouchableOpacity>
        </View>

        {/* 포기하기 버튼 */}
        <TouchableOpacity style={styles.giveUpBtn} onPress={onGiveUp} activeOpacity={0.85}>
          <Text style={styles.giveUpBtnText}>포기하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND.bg },

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

  // 시안의 라운드 박스 형태 지출 row
  expensePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BRAND.pillBorder,
    marginBottom: 8,
  },
  storeText: {
    fontSize: 13,
    fontWeight: "700",
    color: BRAND.tint,
  },
  dateText: {
    fontSize: 10.5,
    color: BRAND.sub,
    marginTop: 3,
  },
  amountText: {
    fontSize: 13,
    fontWeight: "800",
    color: BRAND.text,
    marginLeft: 8,
  },

  fullListBtn: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: BRAND.pillBorder,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  fullListBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: BRAND.tint,
  },

  giveUpBtn: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: BRAND.pillBorder,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: BRAND.bg,
  },
  giveUpBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: BRAND.tint,
  },
});
