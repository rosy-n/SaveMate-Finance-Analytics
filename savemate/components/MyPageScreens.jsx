import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { myPageStyles as styles, BRAND } from "./styles/MyPageStyles";
import { useAuth } from "../state/AuthContext";
import { useApi } from "../hooks/useApi";
import { authStyles as toggleStyles } from "./styles/AuthStyles";

const Toggle = ({ value, onValueChange }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => onValueChange(!value)}
    style={[toggleStyles.toggleTrack, value && toggleStyles.toggleTrackOn]}
  >
    <View style={[toggleStyles.toggleThumb, value && toggleStyles.toggleThumbOn]} />
  </TouchableOpacity>
);

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const RowItem = ({ label, onPress, right, danger }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={onPress}
    style={styles.rowItem}
  >
    <Text style={[styles.rowLabel, danger && { color: "#DC2626" }]}>{label}</Text>
    {right ?? <Text style={styles.chevron}>›</Text>}
  </TouchableOpacity>
);

/* =============== 1) 마이페이지 메인 =============== */
export function MyPageMain() {
  const { user: authUser, logout } = useAuth();
  const [mountedAt] = useState(() => Date.now());

  const user = useMemo(() => {
    const createdAt = authUser?.created_at ? new Date(authUser.created_at) : null;
    const daysTogether =
      createdAt && !Number.isNaN(createdAt.getTime())
        ? Math.max(1, Math.floor((mountedAt - createdAt.getTime()) / 86400000) + 1)
        : 1;
    return { name: authUser?.nickname ?? "", daysTogether };
  }, [authUser, mountedAt]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ alignItems: "center", paddingVertical: 22 }}>
          {authUser?.avatar_url ? (
            <Image source={{ uri: authUser.avatar_url }} style={styles.profileCircle} />
          ) : (
            <View style={styles.profileCircle} />
          )}
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userSub}>Save Mate와 함께한지 {user.daysTogether}일</Text>
        </Card>

        <Card style={{ paddingVertical: 6 }}>
          <RowItem
            label="만족도 알림 설정"
            onPress={() => router.push("/mypage/satisfactionAlarm")}
          />
          <RowItem
            label="과거 챌린지 보기"
            onPress={() => router.push("/mypage/pastChallenges")}
          />
          <RowItem
            label="자주 묻는 질문"
            onPress={() => router.push("/mypage/faq")}
            right={<Text style={styles.chevron}>›</Text>}
          />

          <RowItem
            label="오류나 의견 보내기"
            onPress={() => router.push("/mypage/feedback")}
          />
          <RowItem label="로그아웃" onPress={handleLogout} danger />
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* =============== 2) 만족도 알림 설정 =============== */
export function SatisfactionAlarmSettings() {
  const { user } = useAuth();
  const api = useApi();
  const [enabled, setEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [times, setTimes] = useState(["9시"]);
  const [loading, setLoading] = useState(true);

  const TIME_OPTIONS = ["9시", "12시", "15시", "18시", "21시"];

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    (async () => {
      try {
        const data = await api.get(`/api/alarm-settings`);
        if (!mounted || !data?.ok) return;
        setEnabled(data.settings.enabled);
        setReminderEnabled(data.settings.reminder_enabled);
        setTimes(data.settings.times);
      } catch {
        // 조회 실패 시 기본값 유지
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [api, user?.id]);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/api/alarm-settings", { enabled, reminderEnabled, times });
      Alert.alert("저장 완료", "알림 설정이 저장되었어요 ✅");
    } catch (e) {
      Alert.alert("저장 실패", e.message || "설정을 저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTime = (t) => {
    setTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { justifyContent: "center" }]}>
        <ActivityIndicator color={BRAND.purple} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>만족도 알림 설정</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>만족도 알림</Text>
              <Text style={styles.sectionDesc}>구매 다음 날 만족도를 물어봅니다</Text>
            </View>
            <Toggle value={enabled} onValueChange={setEnabled} />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>알림 시간 설정</Text>
          <Text style={styles.sectionDesc}>
            구매 다음 날 내 만족도를 확인할 시간을 선택하세요
          </Text>

          <View style={styles.chipWrap}>
            {TIME_OPTIONS.map((t) => {
              const active = times.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => toggleTime(t)}
                  style={[
                    styles.chip,
                    active ? styles.chipActive : styles.chipInactive,
                  ]}
                  activeOpacity={0.9}
                >
                  <Text style={active ? styles.chipTextActive : styles.chipText}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>리마인드 알림</Text>
              <Text style={styles.sectionDesc}>
                놓친 만족도가 있을 때 다시 알려줍니다
              </Text>
            </View>
            <Toggle value={reminderEnabled} onValueChange={setReminderEnabled} />
          </View>
        </Card>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.submitBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={BRAND.purple} />
          ) : (
            <Text style={styles.submitBtnText}>저장하기</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* =============== 3) 과거 챌린지 보기 =============== */
export function PastChallenges() {
  const api = useApi();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return undefined;
      let mounted = true;
      setLoading(true);

      api.get("/api/challenges/history")
        .then((res) => {
          if (!mounted) return;
          const nextChallenges = res?.challenges ?? [];
          const nextMonths = [...new Set(
            nextChallenges.map((challenge) => challenge.periodStart?.slice(0, 7)).filter(Boolean)
          )].sort((a, b) => b.localeCompare(a));
          setChallenges(nextChallenges);
          setSelectedMonth((current) => nextMonths.includes(current) ? current : nextMonths[0] ?? null);
          setLoadError(false);
        })
        .catch(() => mounted && setLoadError(true))
        .finally(() => mounted && setLoading(false));

      return () => { mounted = false; };
    }, [api, user?.id])
  );

  const monthOptions = useMemo(() => (
    [...new Set(challenges.map((challenge) => challenge.periodStart?.slice(0, 7)).filter(Boolean))]
      .sort((a, b) => b.localeCompare(a))
  ), [challenges]);

  const summary = useMemo(() => {
    const success = challenges.filter((challenge) => challenge.status === "completed").length;
    const fail = challenges.filter((challenge) => challenge.status === "failed" || challenge.status === "given_up").length;
    const total = success + fail;
    return { success, fail, rate: total ? Math.round((success / total) * 100) : 0 };
  }, [challenges]);

  const challengeList = useMemo(
    () => challenges.filter((challenge) => challenge.periodStart?.startsWith(selectedMonth ?? "")),
    [challenges, selectedMonth]
  );

  const moveMonth = (direction) => {
    if (monthOptions.length < 2) return;
    const current = Math.max(0, monthOptions.indexOf(selectedMonth));
    const next = Math.min(monthOptions.length - 1, Math.max(0, current + direction));
    setSelectedMonth(monthOptions[next]);
  };

  const selectedMonthLabel = selectedMonth
    ? `${selectedMonth.slice(0, 4)}년 ${Number(selectedMonth.slice(5, 7))}월`
    : "기록 없음";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>과거 챌린지 보기</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.sectionTitleCenter}>전체 성과</Text>

          <View style={[styles.rowBetween, { marginTop: 12 }]}>
            <View style={styles.centerCol}>
              <Text style={styles.bigNumber}>{summary.success}</Text>
              <Text style={styles.caption}>성공</Text>
            </View>
            <View style={styles.centerCol}>
              <Text style={[styles.bigNumber, { color: "#EF4444" }]}>
                {summary.fail}
              </Text>
              <Text style={styles.caption}>실패</Text>
            </View>
            <View style={styles.centerCol}>
              <Text style={[styles.bigNumber, { color: BRAND.purple }]}>
                {summary.rate}%
              </Text>
              <Text style={styles.caption}>성공률</Text>
            </View>
          </View>
        </Card>

        <View style={styles.monthNav}>
          <TouchableOpacity
            style={styles.monthArrowButton}
            onPress={() => moveMonth(1)}
            disabled={!selectedMonth || monthOptions.indexOf(selectedMonth) >= monthOptions.length - 1}
          >
            <Text style={styles.monthArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthNavText}>{selectedMonthLabel}</Text>
          <TouchableOpacity
            style={styles.monthArrowButton}
            onPress={() => moveMonth(-1)}
            disabled={!selectedMonth || monthOptions.indexOf(selectedMonth) <= 0}
          >
            <Text style={styles.monthArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator color={BRAND.purple} style={{ marginTop: 20 }} />}
        {!loading && loadError && (
          <Card><Text style={styles.emptyText}>과거 챌린지를 불러오지 못했어요.</Text></Card>
        )}
        {!loading && !loadError && challengeList.length === 0 && (
          <Card><Text style={styles.emptyText}>이 달에 진행한 챌린지가 없어요.</Text></Card>
        )}
        {!loading && !loadError && challengeList.length > 0 && <Card>
          {challengeList.map((c, i) => {
            const success = c.status === "completed";
            const givenUp = c.status === "given_up";
            const diff = c.currentAmount - c.targetAmount;
            return (
              <TouchableOpacity
                key={c.id}
                style={i > 0 && styles.dividerTop}
                activeOpacity={0.8}
                onPress={() => router.push(`/challenge/${c.id}`)}
              >
                <Text style={styles.challengeTitle}>{c.title}</Text>

                <View style={[styles.rowBetween, { marginTop: 8 }]}>
                  <Text style={styles.caption}>목표</Text>
                  <Text style={styles.captionKRW}>
                    {c.targetAmount.toLocaleString()}원
                  </Text>
                </View>

                <View style={[styles.rowBetween, { marginTop: 4 }]}>
                  <Text style={styles.caption}>실제 지출</Text>
                  <Text
                    style={[
                      styles.captionKRW,
                      success ? { color: "#10B981" } : { color: "#EF4444" },
                    ]}
                  >
                    {c.currentAmount.toLocaleString()}원
                  </Text>
                </View>

                <Text
                  style={[
                    styles.resultBadge,
                    success ? styles.badgeSuccess : styles.badgeFail,
                  ]}
                >
                  {givenUp
                    ? "포기한 챌린지"
                    : success
                    ? `${Math.abs(diff).toLocaleString()}원 절약 성공`
                    : `${Math.abs(diff).toLocaleString()}원 초과`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Card>}
      </ScrollView>
    </SafeAreaView>
  );
}

/* =============== 4) 자주 묻는 질문 =============== */
export function FAQScreen() {
  const [openIdx, setOpenIdx] = useState(null);

  const faqs = [
    {
      q: "만족도는 언제 기록하나요?",
      a: "지출 다음 날, 알림을 통해 기록할 수 있어요.",
    },
    {
      q: "챌린지는 어떻게 설정하나요?",
      a: "챌린지 탭에서 카테고리/목표금액을 선택해 시작할 수 있어요.",
    },
    { q: "기록은 수정할 수 있나요?", a: "거래 상세에서 수정/삭제가 가능합니다." },
    { q: "AI 리포트는 어떻게 만들어지나요?", a: "월별 지출 패턴을 요약해 제공해요." },
  ];

  const toggle = (i) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIdx((prev) => (prev === i ? null : i));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>자주 묻는 질문</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          {faqs.map((f, i) => {
            const open = openIdx === i;
            return (
              <View key={i} style={i > 0 && styles.dividerTop}>
                <TouchableOpacity
                  style={styles.faqRow}
                  onPress={() => toggle(i)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.faqQ}>Q. {f.q}</Text>
                  <Text style={styles.faqPlus}>{open ? "−" : "+"}</Text>
                </TouchableOpacity>

                {open && <Text style={styles.faqA}>{f.a}</Text>}
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =============== 5) 오류/의견 보내기 =============== */
export function FeedbackScreen() {
  const api = useApi();
  const [category, setCategory] = useState();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = ["오류 신고", "기능 제안", "기타"];

  const canSubmit = !!category && title.trim() && content.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.post("/api/feedback", {
        category,
        title: title.trim(),
        content: content.trim(),
        email: email.trim() || undefined,
      });

      Alert.alert("전송 완료", "의견이 전달되었어요. 감사합니다 🙏", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("전송 실패", e.message || "네트워크 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>오류나 의견 보내기</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.sectionTitle}>문의 유형</Text>
          <View style={styles.segmentWrap}>
            {categories.map((c) => {
              const active = c === category;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[
                    styles.segment,
                    active ? styles.segmentActive : styles.segmentInactive,
                  ]}
                  activeOpacity={0.9}
                >
                  <Text style={active ? styles.segmentTextActive : styles.segmentText}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>제목</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="제목을 입력해주세요"
            placeholderTextColor={BRAND.gray4}
            style={styles.input}
          />
          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>내용</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="상세 내용을 입력해주세요"
            placeholderTextColor={BRAND.gray4}
            style={[styles.input, styles.textarea]}
            multiline
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>이메일(선택)</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="답변 받을 이메일을 입력해주세요"
            placeholderTextColor={BRAND.gray4}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Card>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.submitBtn, !canSubmit && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={BRAND.purple} />
          ) : (
            <Text style={styles.submitBtnText}>의견 보내기</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default MyPageMain;
