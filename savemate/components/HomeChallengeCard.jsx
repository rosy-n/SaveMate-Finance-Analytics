// components/HomeChallengeCard.jsx
// 홈 화면의 챌린지 카드. 챌린지 탭과 같은 API 를 쓰고, 진행 중 챌린지 중 진행률이 가장 높은 것을 보여준다.
import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { appBus } from '../app/eventBus';
import { getAppToday } from '../constants/appDate';
import { formatFailedOn } from '../constants/challengeFormat';
import { useApi } from '../hooks/useApi';
import { SaveMateStyles as styles } from '../styles/SaveMateStyles';

const highestProgress = (list) =>
  list.reduce((top, c) => (!top || c.progress > top.progress ? c : top), null);

export default function HomeChallengeCard({ refreshKey }) {
  const api = useApi();
  const uid = process.env.EXPO_PUBLIC_UID;

  const [challenges, setChallenges] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/challenges?uid=${uid}&today=${getAppToday()}`);
      setChallenges(res?.challenges ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [api, uid]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => appBus.on('home-focused', load), [load]);

  const ongoing = (challenges ?? []).filter((c) => c.status !== 'failed');
  const failed = (challenges ?? []).filter((c) => c.status === 'failed');
  const main = highestProgress(ongoing) ?? highestProgress(failed);
  const isFailed = main?.status === 'failed';

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.navigate('/challenge')}>
      {main ? (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{main.title}</Text>
            <Text style={[styles.progressText, isFailed && styles.challengeCardPctFail]}>
              {main.progress}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                isFailed && styles.challengeProgressFillFail,
                { width: `${Math.min(main.progress, 100)}%` },
              ]}
            />
          </View>
          <Text style={[styles.cardText, { marginTop: 8 }]}>
            {isFailed ? formatFailedOn(main) : `진행 중 ${ongoing.length}개 · 실패 ${failed.length}개`}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.cardTitle}>챌린지</Text>
          <Text style={styles.cardText}>
            {loadError
              ? '챌린지를 불러오지 못했어요.'
              : challenges === null
                ? '불러오는 중…'
                : '진행 중인 챌린지가 없어요. 눌러서 시작해 보세요.'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
