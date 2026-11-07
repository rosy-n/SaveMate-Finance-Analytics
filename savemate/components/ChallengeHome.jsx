// components/ChallengeHome.jsx
import { getAppNow, getAppToday } from '@/constants/appDate';
import React, { useCallback, useState, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../state/AuthContext";
import { SaveMateStyles as styles } from "../styles/SaveMateStyles";
import { formatFailedOn } from "../constants/challengeFormat";

// 이번 달 남은 일수(오늘 포함). state 로 두지 않고 렌더링할 때 바로 계산한다.
const getRemainingDays = () => {
  const today = getAppNow();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return lastDay - today.getDate() + 1;
};

const ChallengeHome = () => {
  const dDay = getRemainingDays();
  const [sortOption, setSortOption] = useState("위험도순");

  const api = useApi();
  const { user } = useAuth();
  const uid = user?.id;

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadChallenges = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await api.get(`/api/challenges?today=${getAppToday()}`);
      setChallenges(res?.challenges ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [api, uid]);

  // 추가/상세 화면에서 돌아올 때와 다른 탭에서 지출을 입력하고 돌아올 때 진행률을 갱신한다.
  useFocusEffect(
    useCallback(() => {
      loadChallenges();
    }, [loadChallenges])
  );

  const toggleSortOption = () => {
    setSortOption((prev) => (prev === "위험도순" ? "ㄱㄴㄷ순" : "위험도순"));
  };

  const handleAddPress = () => router.push("/challenge/add");
  const handleDetailPress = (id) => router.push(`/challenge/${id}`);

  const giveUp = async (id) => {
    try {
      await api.post(`/api/challenges/${id}/giveup`, { today: getAppToday() });
      await loadChallenges();
    } catch {
      Alert.alert("챌린지 포기", "포기 처리에 실패했어요. 다시 시도해 주세요.");
    }
  };

  const handleMorePress = (c) => {
    Alert.alert(c.title, undefined, [
      { text: "상세 보기", onPress: () => handleDetailPress(c.id) },
      {
        text: "포기하기",
        style: "destructive",
        onPress: () =>
          Alert.alert("챌린지 포기", "정말 포기하시겠어요?", [
            { text: "취소", style: "cancel" },
            { text: "포기하기", style: "destructive", onPress: () => giveUp(c.id) },
          ]),
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  const sorted = useMemo(() => {
    const list = [...challenges];
    return sortOption === "위험도순"
      ? list.sort((a, b) => b.progress - a.progress)
      : list.sort((a, b) => a.title.localeCompare(b.title, "ko"));
  }, [challenges, sortOption]);

  const ongoing = useMemo(() => sorted.filter((c) => c.status !== "failed"), [sorted]);
  const failed = useMemo(() => sorted.filter((c) => c.status === "failed"), [sorted]);

  const renderCard = (c) => {
    const pctRaw = c.progress;
    const pctForBar = Math.min(pctRaw, 100);
    const isFailed = c.status === "failed";

    return (
      <TouchableOpacity
        key={c.id}
        style={styles.challengeCard}
        onPress={() => handleDetailPress(c.id)}
        activeOpacity={0.85}
      >
        <View style={styles.challengeCardRow}>
          {/* 왼쪽 영역 */}
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeCardTitle}>{c.title}</Text>
            <Text style={styles.challengeCardAmount}>
              {c.currentAmount.toLocaleString()}원 / {c.targetAmount.toLocaleString()}원
            </Text>
            {isFailed && (
              <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{formatFailedOn(c)}</Text>
            )}

            <View style={styles.challengeProgressTrack}>
              <View
                style={[
                  styles.challengeProgressFill,
                  isFailed && styles.challengeProgressFillFail,
                  { width: `${pctForBar}%` },
                ]}
              />
            </View>
          </View>

          {/* 오른쪽 영역 (시안처럼 % + …) */}
          <View style={styles.challengeCardRight}>
            <Text style={[styles.challengeCardPct, isFailed && styles.challengeCardPctFail]}>
              {pctRaw}%
            </Text>
            <TouchableOpacity style={styles.challengeMoreBtn} onPress={() => handleMorePress(c)}>
              <Text style={styles.challengeMoreBtnText}>...</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>      
      <View
        style={[
          styles.header,
          {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          },
        ]}
      >
        <Text style={styles.appTitle}>챌린지</Text>

        <TouchableOpacity
          onPress={handleAddPress}
          hitSlop={8}
          style={{
            position: "absolute",
            right: 16,
            top: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            width: 44,
          }}
        >
          <Text
            style={{
              fontSize: 32,
              color: "#7C3AED",
              fontWeight: "700",
              lineHeight: 34,
            }}
          >
            ＋
          </Text>
        </TouchableOpacity>
      </View>


      {/* 서브헤더(기존 스타일 유지) */}
      <View style={styles.challengeSubheader}>
        <Text style={styles.challengeSubheaderText}>진행 중인 챌린지 (D-{dDay})</Text>
        <TouchableOpacity style={styles.sortButton} onPress={toggleSortOption}>
          <Text style={styles.sortButtonText}>{sortOption} ▾</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.challengeList}>
        {loading && <ActivityIndicator style={{ marginTop: 24 }} />}

        {!loading && loadError && (
          <Text style={[styles.emptyText, { textAlign: "center", marginTop: 24 }]}>
            챌린지를 불러오지 못했어요.
          </Text>
        )}

        {!loading && !loadError && challenges.length === 0 && (
          <Text style={[styles.emptyText, { textAlign: "center", marginTop: 24 }]}>
            진행 중인 챌린지가 없어요. ＋를 눌러 시작해 보세요.
          </Text>
        )}

        {ongoing.map(renderCard)}

        {failed.length > 0 && (
          <>
            <Text style={styles.failedChallengeTitle}>실패한 챌린지</Text>
            {failed.map(renderCard)}
          </>
        )}

        <TouchableOpacity
          onPress={() => router.push("/challenge/history")}
          activeOpacity={0.8}
          style={{
            marginTop: 16,
            marginBottom: 24,
            paddingVertical: 14,
            alignItems: "center",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#D1D5DB",
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#6B7280" }}>지난 챌린지 보기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChallengeHome;
