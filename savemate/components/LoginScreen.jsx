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

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !submitting;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      await login(username.trim(), password, remember);
      router.replace("/(tabs)/home");
    } catch (e) {
      setError(e.message || "로그인에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandWrap}>
            <Text style={styles.brandTitle}>Save Mate</Text>
            <Text style={styles.brandSub}>로그인하고 소비 습관을 기록해보세요</Text>
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
              placeholder="아이디를 입력해주세요"
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
              placeholder="비밀번호를 입력해주세요"
              placeholderTextColor={BRAND.gray4}
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.rowBetween}>
            <TouchableOpacity
              style={styles.rememberRow}
              activeOpacity={0.8}
              onPress={() => setRemember((v) => !v)}
            >
              <View style={[styles.toggleTrack, remember && styles.toggleTrackOn]}>
                <View style={[styles.toggleThumb, remember && styles.toggleThumbOn]} />
              </View>
              <Text style={styles.rememberText}>자동 로그인</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>로그인</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>계정이 없으신가요?</Text>
            <TouchableOpacity onPress={() => router.push("/signup")}>
              <Text style={styles.footerLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
