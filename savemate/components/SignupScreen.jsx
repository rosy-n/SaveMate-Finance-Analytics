import React, { useState } from "react";
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { authStyles as styles } from "./styles/AuthStyles";
import { BRAND } from "./styles/MyPageStyles";
import { useAuth } from "../state/AuthContext";

const USERNAME_RE = /^[A-Za-z0-9_]{4,20}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function SignupScreen() {
  const { signup, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (!USERNAME_RE.test(username)) return "아이디는 영문/숫자/밑줄 4~20자로 입력해주세요.";
    if (password.length < 8) return "비밀번호는 8자 이상이어야 해요.";
    if (password !== passwordConfirm) return "비밀번호가 일치하지 않아요.";
    if (nickname.trim().length < 2 || nickname.trim().length > 20)
      return "닉네임은 2~20자로 입력해주세요.";
    if (!EMAIL_RE.test(email)) return "이메일 형식이 올바르지 않아요.";
    return "";
  };

  const canSubmit =
    username && password && passwordConfirm && nickname && email && !submitting;

  const handleSignup = async () => {
    if (!canSubmit) return;
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await signup({ username: username.trim(), password, nickname: nickname.trim(), email: email.trim() });
      await login(username.trim(), password, true);
      router.replace("/(tabs)/home");
    } catch (e) {
      setError(e.message || "회원가입에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.backRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandWrap}>
            <Text style={styles.brandTitle}>회원가입</Text>
            <Text style={styles.brandSub}>Save Mate와 함께 소비를 기록해보세요</Text>
          </View>

          {!!error && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>아이디</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="영문/숫자/밑줄 4~20자"
              placeholderTextColor={BRAND.gray4}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="8자 이상"
              placeholderTextColor={BRAND.gray4}
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호를 한 번 더 입력해주세요"
              placeholderTextColor={BRAND.gray4}
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>닉네임</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="2~20자"
              placeholderTextColor={BRAND.gray4}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor={BRAND.gray4}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled, { marginTop: 8 }]}
            onPress={handleSignup}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>가입하기</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>이미 계정이 있으신가요?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>로그인</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
