import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type OnboardingState } from "../api/onboardingApi";
import { t } from "../i18n";
import { useLocale } from "../i18n/LocaleContext";
import { createThemeStyles, theme, useTheme } from "../theme/theme";
import { ErrorState, LoadingState, SheetHeader } from "../components/ui";

type Props = {
  visible: boolean;
  state: OnboardingState | null;
  loading: boolean;
  isDemo: boolean;
  onClose: () => void;
  onEdit: () => void;
};

export function OnboardingSettingsScreen({ visible, state, loading, isDemo, onClose, onEdit }: Props) {
  useTheme();
  useLocale();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={styles.sheet}>
      <SheetHeader title={t("onboarding.settingsTitle")} onClose={onClose} />
      <Text style={styles.description}>{t("onboarding.settingsDescription")}</Text>
      {loading ? <LoadingState /> : !state ? <ErrorState title={t("common.unavailable")} /> : <ScrollView contentContainerStyle={styles.content}>
        {isDemo ? <View style={styles.demo}><Ionicons name="flask-outline" size={18} color={theme.colors.info} /><Text style={styles.demoText}>{t("onboarding.demoReadOnly")}</Text></View> : null}
        <Summary label={t("onboarding.company")} value={state.companyName ?? t("onboarding.dataMissing")} />
        <Summary label={t("onboarding.companyInput")} value={state.nip ?? t("onboarding.dataMissing")} />
        <Summary label="REGON" value={state.regon ?? t("onboarding.dataMissing")} />
        <Summary label={t("onboarding.address")} value={state.registeredAddress ?? t("onboarding.dataMissing")} />
        <Summary label={t("onboarding.taxation")} value={t("onboarding.taxationValue")} />
        <Summary label={t("onboarding.ksef")} value={state.ksefState === "SKIPPED" ? t("onboarding.ksefLater") : state.ksefState ?? t("onboarding.dataMissing")} />
        {!isDemo ? <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={t("onboarding.edit")} style={styles.edit}><Ionicons name="create-outline" size={19} color={theme.colors.onAccent} /><Text style={styles.editText}>{t("onboarding.edit")}</Text></Pressable> : null}
      </ScrollView>}
    </View></View>
  </Modal>;
}

function Summary({ label, value }: { label: string; value: string }) { return <View style={styles.summary} accessibilityLabel={`${label}: ${value}`}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>; }

const styles = createThemeStyles({ overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: theme.colors.overlay }, sheet: { maxHeight: "92%", backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }, description: { color: theme.colors.textSecondary, lineHeight: 20, marginBottom: theme.spacing.lg }, content: { gap: theme.spacing.md, paddingBottom: theme.spacing.md }, summary: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: theme.radius.control, padding: theme.spacing.lg }, label: { color: theme.colors.textSecondary, fontSize: theme.typography.caption, marginBottom: theme.spacing.xs }, value: { color: theme.colors.textPrimary, fontSize: theme.typography.body, fontWeight: "700" }, demo: { alignItems: "center", backgroundColor: theme.colors.infoSoft, borderRadius: theme.radius.control, flexDirection: "row", gap: theme.spacing.sm, padding: theme.spacing.md }, demoText: { color: theme.colors.info, flex: 1, lineHeight: 19 }, edit: { alignItems: "center", backgroundColor: theme.colors.accent, borderRadius: theme.radius.control, flexDirection: "row", gap: theme.spacing.sm, justifyContent: "center", minHeight: 52, marginTop: theme.spacing.sm }, editText: { color: theme.colors.onAccent, fontSize: theme.typography.button, fontWeight: "800" } });
