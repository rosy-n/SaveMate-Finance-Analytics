// components/ChallengeHome.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SaveMateStyles as styles } from "../styles/SaveMateStyles";

const ChallengeHome = () => {
  const [dDay, setDDay] = useState(0);
  const [sortOption, setSortOption] = useState("위험도순");

  // ✅ 더미(기존 유지)
  const [challenges] = useState([
    {
      id: 42,
      title: "카페/간식 챌린지",
      currentAmount: 146000,
      targetAmount: 200000,
      progress: 73,
      status: "ongoing",
    },
    {
      id: 43,
      title: "카페/간식 챌린지",
      currentAmount: 250000,
      targetAmount: 200000,
      progress: 125,
      status: "failed",
    },
  ]);

  useEffect(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    setDDay(lastDay - today.getDate() + 1);
  }, []);

  const toggleSortOption = () => {
    setSortOption((prev) => (prev === "위험도순" ? "ㄱㄴㄷ순" : "위험도순"));
  };

  const handleAddPress = () => router.push("/challenge/add");
  const handleDetailPress = (id) => router.push(`/challenge/${id}`);

  const ongoing = useMemo(
    () => challenges.filter((c) => c.progress <= 100),
    [challenges]
  );
  const failed = useMemo(
    () => challenges.filter((c) => c.progress > 100),
    [challenges]
  );

  const renderCard = (c) => {
    const pctRaw = Math.round((c.currentAmount / c.targetAmount) * 100);
    const pctForBar = Math.min(pctRaw, 100);
    const isFailed = pctRaw > 100;

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
            <TouchableOpacity style={styles.challengeMoreBtn}>
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
          onPress={() => router.push("/challenge/add")}
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
        {ongoing.map(renderCard)}

        {failed.length > 0 && (
          <>
            <Text style={styles.failedChallengeTitle}>실패한 챌린지</Text>
            {failed.map(renderCard)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChallengeHome;
