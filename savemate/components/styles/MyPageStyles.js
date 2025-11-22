// styles/MyPageStyles.js
import { StyleSheet, Platform } from "react-native";

export const BRAND = {
  purple: "#7C3AED",
  purpleSoft: "#F3E8FF",
  gray0: "#FFFFFF",
  gray1: "#F9FAFB",
  gray2: "#F3F4F6",
  gray3: "#E5E7EB",
  gray4: "#9CA3AF",
  text: "#111827",
};

export const myPageStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BRAND.gray0 },

  header: {
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: "center",
    backgroundColor: BRAND.gray0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: BRAND.purple,
  },

  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: BRAND.gray0,
  },
  subHeaderTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: BRAND.purple,
  },
  backBtn: { padding: 4 },
  backChevron: { fontSize: 26, color: BRAND.purple },

  content: { padding: 16, gap: 12 },

  card: {
    backgroundColor: BRAND.gray0,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.gray3,
  },

  profileCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: BRAND.gray3,
    marginBottom: 10,
  },
  userName: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  userSub: { fontSize: 12, color: BRAND.gray4, marginTop: 4 },

  rowItem: {
    paddingVertical: 14,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: { fontSize: 15, color: BRAND.text, fontWeight: "600" },
  chevron: { fontSize: 18, color: BRAND.gray4, fontWeight: "700" },
  dotPink: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EC4899",
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: { fontSize: 14, fontWeight: "800", color: BRAND.text },
  sectionTitleCenter: {
    fontSize: 14,
    fontWeight: "800",
    color: BRAND.text,
    textAlign: "center",
  },
  sectionDesc: { fontSize: 12, color: BRAND.gray4, marginTop: 4 },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    minWidth: 64,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  chipInactive: {
    backgroundColor: BRAND.gray2,
    borderWidth: 1,
    borderColor: BRAND.gray3,
  },
  chipActive: {
    backgroundColor: BRAND.purpleSoft,
    borderWidth: 1,
    borderColor: "#C4B5FD",
  },
  chipText: { color: BRAND.gray4, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: BRAND.purple, fontWeight: "800", fontSize: 13 },

  bigNumber: { fontSize: 20, fontWeight: "800", color: "#10B981" },
  caption: { fontSize: 12, color: BRAND.gray4, marginTop: 4 },
  centerCol: { alignItems: "center", flex: 1 },

  monthDropRow: { alignItems: "flex-start" },
  monthDrop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: BRAND.gray2,
    borderWidth: 1,
    borderColor: BRAND.gray3,
  },
  monthDropText: { fontSize: 12, fontWeight: "800", color: BRAND.text },
  monthDropChevron: { fontSize: 12, color: BRAND.gray4 },

  dividerTop: {
    borderTopWidth: 1,
    borderTopColor: BRAND.gray3,
    paddingTop: 12,
    marginTop: 12,
  },

  challengeTitle: { fontSize: 14, fontWeight: "800", color: BRAND.text },
  captionKRW: { fontSize: 12, fontWeight: "700", color: BRAND.text },
  resultBadge: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  badgeSuccess: { backgroundColor: "#ECFDF5", color: "#10B981" },
  badgeFail: { backgroundColor: "#FEF2F2", color: "#EF4444" },

  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  faqQ: { fontSize: 14, fontWeight: "700", color: BRAND.text },
  faqPlus: { fontSize: 18, fontWeight: "900", color: BRAND.gray4 },
  faqA: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
    paddingBottom: 6,
  },

  segmentWrap: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
  },
  segmentInactive: {
    backgroundColor: BRAND.gray0,
    borderColor: "#D8B4FE",
  },
  segmentActive: {
    backgroundColor: BRAND.purpleSoft,
    borderColor: BRAND.purple,
  },
  segmentText: { fontSize: 12, color: BRAND.purple, fontWeight: "700" },
  segmentTextActive: { fontSize: 12, color: BRAND.purple, fontWeight: "900" },

  input: {
    marginTop: 8,
    backgroundColor: BRAND.gray1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BRAND.gray3,
    fontSize: 14,
    color: BRAND.text,
  },
  textarea: {
    height: 140,
    textAlignVertical: "top",
  },

  submitBtn: {
    backgroundColor: BRAND.purpleSoft,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  submitBtnText: {
    color: BRAND.purple,
    fontWeight: "900",
    fontSize: 14,
  },
});
