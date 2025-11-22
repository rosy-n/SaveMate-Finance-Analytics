import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { router } from "expo-router";
import { myPageStyles as styles, BRAND } from "./styles/MyPageStyles";

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
  const user = useMemo(
    () => ({
      name: "노지은",
      daysTogether: 127,
    }),
    []
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ alignItems: "center", paddingVertical: 22 }}>
          <View style={styles.profileCircle} />
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
          <RowItem label="로그아웃" onPress={() => {}} danger />
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* =============== 2) 만족도 알림 설정 =============== */
export function SatisfactionAlarmSettings() {
  const [enabled, setEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [times, setTimes] = useState(["9시"]);

  const TIME_OPTIONS = ["9시", "12시", "15시", "18시", "21시"];

  const toggleTime = (t) => {
    setTimes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

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
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: BRAND.gray3, true: "#C4B5FD" }}
              thumbColor={enabled ? BRAND.purple : "#fff"}
            />
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
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: BRAND.gray3, true: "#C4B5FD" }}
              thumbColor={reminderEnabled ? BRAND.purple : "#fff"}
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =============== 3) 과거 챌린지 보기 =============== */
export function PastChallenges() {
  const [selectedMonth, setSelectedMonth] = useState("8월");

  const summary = { success: 3, fail: 2, rate: 60 };

  const challengeList = [
    {
      id: "c1",
      title: "식비 챌린지",
      target: 150000,
      actual: 132400,
      success: true,
    },
    {
      id: "c2",
      title: "카페/간식 챌린지",
      target: 80000,
      actual: 96000,
      success: false,
    },
  ];

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

        <View style={styles.monthDropRow}>
          <TouchableOpacity
            style={styles.monthDrop}
            activeOpacity={0.9}
            onPress={() => setSelectedMonth((m) => (m === "8월" ? "7월" : "8월"))}
          >
            <Text style={styles.monthDropText}>{selectedMonth}</Text>
            <Text style={styles.monthDropChevron}>▾</Text>
          </TouchableOpacity>
        </View>

        <Card>
          {challengeList.map((c, i) => {
            const diff = c.actual - c.target;
            return (
              <View key={c.id} style={i > 0 && styles.dividerTop}>
                <Text style={styles.challengeTitle}>{c.title}</Text>

                <View style={[styles.rowBetween, { marginTop: 8 }]}>
                  <Text style={styles.caption}>목표</Text>
                  <Text style={styles.captionKRW}>
                    {c.target.toLocaleString()}원
                  </Text>
                </View>

                <View style={[styles.rowBetween, { marginTop: 4 }]}>
                  <Text style={styles.caption}>실제 지출</Text>
                  <Text
                    style={[
                      styles.captionKRW,
                      c.success ? { color: "#10B981" } : { color: "#EF4444" },
                    ]}
                  >
                    {c.actual.toLocaleString()}원
                  </Text>
                </View>

                <Text
                  style={[
                    styles.resultBadge,
                    c.success ? styles.badgeSuccess : styles.badgeFail,
                  ]}
                >
                  {c.success
                    ? `${Math.abs(diff).toLocaleString()}원 절약 성공`
                    : `${Math.abs(diff).toLocaleString()}원 초과`}
                </Text>
              </View>
            );
          })}
        </Card>
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
  const [category, setCategory] = useState();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");

  const categories = ["오류 신고", "기능 제안", "기타"];

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

        <TouchableOpacity activeOpacity={0.9} style={styles.submitBtn}>
          <Text style={styles.submitBtnText}>의견 보내기</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default MyPageMain;
