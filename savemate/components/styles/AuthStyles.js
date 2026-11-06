// styles/AuthStyles.js
import { StyleSheet } from "react-native";
import { BRAND } from "./MyPageStyles";

export const authStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BRAND.gray0 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: "center" },

  brandWrap: { alignItems: "center", marginBottom: 36 },
  brandTitle: { fontSize: 26, fontWeight: "800", color: BRAND.purple },
  brandSub: { fontSize: 13, color: BRAND.gray4, marginTop: 6 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "700", color: BRAND.text, marginBottom: 6 },
  input: {
    backgroundColor: BRAND.gray1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BRAND.gray3,
    fontSize: 15,
    color: BRAND.text,
  },
  inputError: { borderColor: "#EF4444" },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 6 },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 20,
  },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rememberText: { fontSize: 13, color: BRAND.gray4, fontWeight: "600" },

  // 네이티브 Switch는 Android에서 켤 때 원 색이 시스템 테마(초록)로 강제되는 경우가 있어서
  // 직접 그린 토글로 대체한다 (항상 정확한 보라색을 보장).
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: BRAND.gray3,
    padding: 2,
    justifyContent: "center",
  },
  toggleTrackOn: { backgroundColor: "#C4B5FD" },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  toggleThumbOn: { backgroundColor: BRAND.purple, alignSelf: "flex-end" },

  primaryBtn: {
    backgroundColor: BRAND.purple,
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
    gap: 6,
  },
  footerText: { fontSize: 13, color: BRAND.gray4 },
  footerLink: { fontSize: 13, color: BRAND.purple, fontWeight: "800" },

  banner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  bannerText: { color: "#DC2626", fontSize: 13, fontWeight: "600", textAlign: "center" },

  backRow: { paddingHorizontal: 14, paddingTop: 6 },
  backBtn: { padding: 4, alignSelf: "flex-start" },
  backChevron: { fontSize: 26, color: BRAND.purple },
});
