import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { onboardingApi, type CompanyLookup, type OnboardingState } from "../api/onboardingApi";
import { NipValidator } from "../validation/nip";
import { createThemeStyles, theme, useTheme } from "../theme/theme";
import { t } from "../i18n";
import { useLocale } from "../i18n/LocaleContext";

type Props = { onComplete: () => Promise<void>; initialState?: OnboardingState | null };

export function OnboardingScreen({ onComplete, initialState }: Props) {
  useTheme();
  useLocale();
  const { profileId, token, isDemo } = useAuth();
  const demoCompany: CompanyLookup = { nip: "5261040828", companyName: "Investory Demo JDG", regon: "123456789", vatStatus: "Czynny", registeredAddress: "ul. Demo 1, 00-001 Warszawa", source: "DEMO" };
  const [step, setStep] = useState(0);
  const [nip, setNip] = useState(initialState?.nip ?? (isDemo ? demoCompany.nip : ""));
  const [company, setCompany] = useState<CompanyLookup | null>(initialState?.companyName ? { nip: initialState.nip ?? "", companyName: initialState.companyName, regon: initialState.regon, vatStatus: initialState.vatStatus, registeredAddress: initialState.registeredAddress, source: initialState.companySource ?? "CONFIRMED" } : isDemo ? demoCompany : null);
  const [uop, setUop] = useState(initialState?.qualifyingUop ?? false);
  const [sickness, setSickness] = useState(initialState?.voluntarySickness ?? false);
  const [ksefToken, setKsefToken] = useState("");
  const [ksefEnvironment, setKsefEnvironment] = useState<"TEST" | "DEMO" | "PRODUCTION">("TEST");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = profileId == null ? null : onboardingApi(token);

  async function lookup() {
    setError(null);
    if (!NipValidator.isValid(nip)) { setError(t("onboarding.invalidNip")); return; }
    setBusy(true);
    try { setCompany(isDemo ? demoCompany : await api!.lookupCompany(profileId!, nip)); setStep(1); }
    catch { setError(t("onboarding.lookupError")); }
    finally { setBusy(false); }
  }

  async function next() {
    setError(null); setBusy(true);
    try {
      if (step === 1) { if (!company) return; if (!isDemo) await api!.confirmCompany(profileId!, company); setStep(2); }
      else if (step === 2) { if (!isDemo) await api!.confirmAccounting(profileId!); setStep(3); }
      else if (step === 3) { if (!isDemo) await api!.saveZus(profileId!, { qualifyingUop: uop, voluntarySickness: sickness }); setStep(4); }
      else { if (!isDemo) await api!.complete(profileId!, "SKIPPED"); await onComplete(); }
    } catch { setError(t("onboarding.saveError")); }
    finally { setBusy(false); }
  }

  async function connectKsef() {
    setError(null);
    if (!ksefToken.trim() || isDemo || profileId == null) return;
    setBusy(true);
    try {
      await api!.connectKsef(profileId, ksefEnvironment, ksefToken);
      await api!.complete(profileId, "CONNECTED");
      await onComplete();
    } catch {
      setError(t("onboarding.ksefConnectError"));
    } finally {
      setBusy(false);
    }
  }

  const titles = [t("onboarding.companyTitle"), t("onboarding.companyConfirmTitle"), t("onboarding.accountingTitle"), t("onboarding.zusTitle"), t("onboarding.automationTitle")];
  const description = step === 0 ? t("onboarding.companyDescription") : step === 4 ? t("onboarding.automationDescription") : t("onboarding.accountingDescription");
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>{t("onboarding.eyebrow").replace("{step}", String(step + 1))}</Text><Text style={styles.title}>{titles[step]}</Text><Text style={styles.subtitle}>{description}</Text>
    {isDemo ? <Text style={styles.demoNote}>{t("onboarding.demoReadOnly")}</Text> : null}
    {step === 0 ? <><Text style={styles.label}>{t("onboarding.companyInput")}</Text><TextInput value={nip} onChangeText={setNip} keyboardType="number-pad" style={styles.input} placeholder={t("onboarding.companyPlaceholder")} placeholderTextColor={theme.colors.textMuted} accessibilityLabel={t("onboarding.companyInput")} accessibilityHint={t("onboarding.companyDescription")} editable={!busy} /><Button label={t("onboarding.lookup")} onPress={lookup} busy={busy} /></> : null}
    {step === 1 && company ? <><Card label={t("onboarding.company")} value={company.companyName ?? t("onboarding.dataMissing")} /><Card label={t("onboarding.companyInput")} value={company.nip} /><Card label="REGON" value={company.regon ?? t("onboarding.dataMissing")} /><Card label={t("onboarding.address")} value={company.registeredAddress ?? t("onboarding.dataMissing")} /><Card label={t("onboarding.vat")} value={company.vatStatus ?? t("onboarding.dataMissing")} /><Button label={t("onboarding.companyConfirm")} onPress={next} busy={busy} /></> : null}
    {step === 2 ? <><Card label={t("onboarding.legalForm")} value={t("onboarding.jdg")} /><Card label={t("onboarding.taxation")} value={t("onboarding.taxationValue")} /><Card label={t("onboarding.vat")} value={t("onboarding.vatValue")} /><Button label={t("onboarding.accountingConfirm")} onPress={next} busy={busy} /></> : null}
    {step === 3 ? <><Text style={styles.question}>{t("onboarding.uopQuestion")}</Text><Choice label={t("onboarding.no")} selected={!uop} onPress={() => setUop(false)} /><Choice label={t("onboarding.yes")} selected={uop} onPress={() => setUop(true)} /><Text style={styles.question}>{t("onboarding.sicknessQuestion")}</Text><Choice label={t("onboarding.no")} selected={!sickness} onPress={() => setSickness(false)} /><Choice label={t("onboarding.yes")} selected={sickness} onPress={() => setSickness(true)} /><Button label={t("onboarding.zusContinue")} onPress={next} busy={busy} /></> : null}
    {step === 4 ? <>
      <Card label={t("onboarding.ksef")} value={t("onboarding.ksefLater")} />
      {!isDemo ? <>
        <Text style={styles.label}>{t("onboarding.ksefEnvironment")}</Text>
        <Choice label={t("onboarding.testEnvironment")} selected={ksefEnvironment === "TEST"} onPress={() => setKsefEnvironment("TEST")} />
        <Choice label={t("onboarding.demoEnvironment")} selected={ksefEnvironment === "DEMO"} onPress={() => setKsefEnvironment("DEMO")} />
        <Choice label={t("onboarding.productionEnvironment")} selected={ksefEnvironment === "PRODUCTION"} onPress={() => setKsefEnvironment("PRODUCTION")} />
        <TextInput value={ksefToken} onChangeText={setKsefToken} secureTextEntry autoCapitalize="none" autoCorrect={false} style={styles.input} placeholder={t("onboarding.ksefToken")} placeholderTextColor={theme.colors.textMuted} accessibilityLabel={t("onboarding.ksefToken")} accessibilityHint={t("onboarding.ksefTokenHint")} editable={!busy} />
        <Text style={styles.hint}>{t("onboarding.ksefTokenHint")}</Text>
        <Button label={t("onboarding.connectKsef")} onPress={connectKsef} busy={busy || !ksefToken.trim()} />
      </> : null}
      <Button label={t("onboarding.skipKsef")} onPress={next} busy={busy} />
    </> : null}
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
  </ScrollView></SafeAreaView>;
}

function Button({ label, onPress, busy }: { label: string; onPress: () => void; busy: boolean }) { return <Pressable disabled={busy} onPress={onPress} accessibilityRole="button" accessibilityLabel={busy ? t("onboarding.loading") : label} accessibilityState={{ disabled: busy, busy }} style={[styles.button, busy && styles.disabled]}>{busy ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.buttonText}>{label}</Text>}</Pressable>; }
function Card({ label, value }: { label: string; value: string }) { return <View style={styles.card} accessibilityLabel={`${label}: ${value}`}><Text style={styles.cardLabel}>{label}</Text><Text style={styles.cardValue}>{value}</Text></View>; }
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected }} style={[styles.choice, selected && styles.choiceSelected]}><Text style={styles.choiceText}>{selected ? "✓ " : ""}{label}</Text></Pressable>; }

const styles = createThemeStyles({ safe: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: theme.spacing.xl, gap: theme.spacing.md }, eyebrow: { color: theme.colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1 }, title: { color: theme.colors.textPrimary, fontSize: 30, fontWeight: "800", marginTop: theme.spacing.sm }, subtitle: { color: theme.colors.textSecondary, fontSize: 16, lineHeight: 23, marginBottom: theme.spacing.lg }, demoNote: { color: theme.colors.info, backgroundColor: theme.colors.infoSoft, borderRadius: theme.radius.control, padding: theme.spacing.md, lineHeight: 19 }, label: { color: theme.colors.textPrimary, fontWeight: "700" }, input: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, borderWidth: 1, color: theme.colors.textPrimary, fontSize: 18, padding: theme.spacing.lg }, hint: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 }, button: { alignItems: "center", backgroundColor: theme.colors.accent, borderRadius: theme.radius.control, justifyContent: "center", minHeight: 54, marginTop: theme.spacing.lg }, buttonText: { color: theme.colors.onAccent, fontSize: 16, fontWeight: "800" }, card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, borderWidth: 1, padding: theme.spacing.lg }, cardLabel: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 }, cardValue: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: "700" }, question: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: "700", lineHeight: 24, marginTop: theme.spacing.md }, choice: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, borderWidth: 1, padding: theme.spacing.lg }, choiceSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.accentSoft }, choiceText: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: "700" }, error: { color: theme.colors.danger, lineHeight: 20, marginTop: theme.spacing.md }, disabled: { opacity: 0.55 } });
