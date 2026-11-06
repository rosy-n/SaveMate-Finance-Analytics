// components/ChallengeHistory.jsx
// 기간이 끝났거나 포기한 챌린지 목록
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getAppToday } from "../constants/appDate";
import { formatFailedOn, formatPeriod } from "../constants/challengeFormat";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../state/AuthContext";
import { SaveMateStyles } from "../styles/SaveMateStyles";

const STATUS = {
  completed: { label: "완료", color: "#059669", background: "#D1FAE5" },
  failed: { label: "실패", color: "#DC2626", background: "#FEE2E2" },
  given_up: { label: "포기", color: "#6B7280", background: "#F3F4F6" },
};

export default function ChallengeHistory() {
  const api = useApi();
  const { user } = useAuth();
  const uid = user?.id;

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      (async () => {
        try {
          const res = await api.get(`/api/challenges/history?today=${getAppToday()}`);
          setChallenges(res?.challenges ?? []);
          setLoadError(false);
        } catch {
          setLoadError(true);
        } finally {
          setLoading(false);
        }
      })();
    }, [api, uid])
  );

  const renderCard = (c) => {
    // 포기한 챌린지는 기간이 남아 있어도 status 가 given_up 이다.
    const status = STATUS[c.status] ?? STATUS.completed;
    return (
      <TouchableOpacity
        key={c.id}
        style={SaveMateStyles.challengeCard}
        onPress={() => router.push(`/challenge/${c.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.titleRow}>
          <Text style={[SaveMateStyles.challengeCardTitle, styles.title]} numberOfLines={1}>
            {c.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: status.background }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={SaveMateStyles.challengeCardAmount}>
          {c.currentAmount.toLocaleString()}원 / {c.targetAmount.toLocaleString()}원 ({c.progress}%)
        </Text>
        <Text style={styles.period}>{formatPeriod(c.periodStart, c.periodEnd)}</Text>
        {c.status === "failed" && <Text style={styles.period}>{formatFailedOn(c)}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={SaveMateStyles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>지난 챌린지</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={SaveMateStyles.challengeList}>
        {loading && <ActivityIndicator style={styles.message} />}

        {!loading && loadError && (
          <Text style={[SaveMateStyles.emptyText, styles.message]}>챌린지를 불러오지 못했어요.</Text>
        )}

        {!loading && !loadError && challenges.length === 0 && (
          <Text style={[SaveMateStyles.emptyText, styles.message]}>아직 지난 챌린지가 없어요.</Text>
        )}

        {challenges.map(renderCard)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 24 },
  backText: { fontSize: 28, color: "#111827" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  period: { marginTop: 6, fontSize: 12, color: "#6B7280" },
  message: { textAlign: "center", marginTop: 24 },
});
