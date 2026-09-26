import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { onboardingApi, type CompanyLookup } from '../api/onboardingApi';
import { NipValidator } from '../validation/nip';
import { theme } from '../theme/theme';

type Props = { onComplete: () => Promise<void> };

export function OnboardingScreen({ onComplete }: Props) {
  const { profileId, token, isDemo } = useAuth();
  const [step, setStep] = useState(0);
  const [nip, setNip] = useState(isDemo ? '5261040828' : '');
  const [company, setCompany] = useState<CompanyLookup | null>(isDemo ? { nip: '5261040828', companyName: 'Investory Demo JDG', regon: '123456789', vatStatus: 'Czynny', registeredAddress: 'ul. Demo 1, 00-001 Warszawa', source: 'DEMO' } : null);
  const [uop, setUop] = useState(false);
  const [sickness, setSickness] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = profileId == null ? null : onboardingApi(token);

  async function lookup() {
    setError(null);
    if (!NipValidator.isValid(nip)) { setError('Wpisz poprawny NIP.'); return; }
    setBusy(true);
    try { setCompany(isDemo ? company : await api!.lookupCompany(profileId!, nip)); setStep(1); }
    catch { setError('Nie udało się pobrać danych firmy. Spróbuj ponownie później lub skontaktuj się z pomocą.'); }
    finally { setBusy(false); }
  }

  async function next() {
    setError(null); setBusy(true);
    try {
      if (step === 1) { if (!company) return; if (!isDemo) await api!.confirmCompany(profileId!, company); setStep(2); }
      else if (step === 2) { if (!isDemo) await api!.confirmAccounting(profileId!); setStep(3); }
      else if (step === 3) { if (!isDemo) await api!.saveZus(profileId!, { qualifyingUop: uop, voluntarySickness: sickness }); setStep(4); }
      else { if (!isDemo) await api!.complete(profileId!, 'SKIPPED'); await onComplete(); }
    } catch { setError('Nie udało się zapisać ustawień. Spróbuj ponownie.'); }
    finally { setBusy(false); }
  }

  const title = ['Znajdź swoją firmę', 'Potwierdź dane firmy', 'Twoje rozliczenia', 'Składki ZUS', 'Automatyzacja'][step];
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>KONFIGURACJA {step + 1} / 5</Text><Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{step === 0 ? 'Wpisz NIP, a uzupełnimy dane firmy automatycznie.' : step === 4 ? 'Połącz KSeF teraz albo zrób to później w Ustawieniach.' : 'Kilka krótkich informacji wystarczy, aby rozpocząć pracę.'}</Text>
    {step === 0 ? <><Text style={styles.label}>NIP</Text><TextInput value={nip} onChangeText={setNip} keyboardType="number-pad" style={styles.input} placeholder="1234567890" placeholderTextColor={theme.colors.textMuted} /><Button label="Pobierz dane firmy" onPress={lookup} busy={busy} /></> : null}
    {step === 1 && company ? <><Card label="Nazwa firmy" value={company.companyName ?? 'Brak danych'} /><Card label="NIP" value={company.nip} /><Card label="REGON" value={company.regon ?? 'Brak danych'} /><Card label="Adres" value={company.registeredAddress ?? 'Brak danych'} /><Card label="VAT" value={company.vatStatus ?? 'Brak danych'} /><Button label="To moja firma" onPress={next} busy={busy} /></> : null}
    {step === 2 ? <><Card label="Forma prawna" value="JDG" /><Card label="Podatek" value="Ryczałt 12%, PIT miesięcznie" /><Card label="VAT" value="Czynny podatnik VAT, VAT miesięcznie" /><Button label="Potwierdzam i kontynuuję" onPress={next} busy={busy} /></> : null}
    {step === 3 ? <><Text style={styles.question}>Czy jesteś równocześnie zatrudniony na umowę o pracę?</Text><Choice label="Nie" selected={!uop} onPress={() => setUop(false)} /><Choice label="Tak" selected={uop} onPress={() => setUop(true)} /><Text style={styles.question}>Czy opłacasz dobrowolne ubezpieczenie chorobowe?</Text><Choice label="Nie" selected={!sickness} onPress={() => setSickness(false)} /><Choice label="Tak" selected={sickness} onPress={() => setSickness(true)} /><Button label="Zapisz i kontynuuj" onPress={next} busy={busy} /></> : null}
    {step === 4 ? <><Card label="KSeF" value="Możesz połączyć później w Ustawieniach" /><Button label="Pomiń na teraz" onPress={next} busy={busy} /></> : null}
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
  </ScrollView></SafeAreaView>;
}

function Button({ label, onPress, busy }: { label: string; onPress: () => void; busy: boolean }) { return <Pressable disabled={busy} onPress={onPress} style={[styles.button, busy && styles.disabled]}>{busy ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.buttonText}>{label}</Text>}</Pressable>; }
function Card({ label, value }: { label: string; value: string }) { return <View style={styles.card}><Text style={styles.cardLabel}>{label}</Text><Text style={styles.cardValue}>{value}</Text></View>; }
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Text style={styles.choiceText}>{selected ? '✓ ' : ''}{label}</Text></Pressable>; }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: theme.spacing.xl, gap: theme.spacing.md }, eyebrow: { color: theme.colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 }, title: { color: theme.colors.textPrimary, fontSize: 30, fontWeight: '800', marginTop: theme.spacing.sm }, subtitle: { color: theme.colors.textSecondary, fontSize: 16, lineHeight: 23, marginBottom: theme.spacing.lg }, label: { color: theme.colors.textPrimary, fontWeight: '700' }, input: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, borderWidth: 1, color: theme.colors.textPrimary, fontSize: 18, padding: theme.spacing.lg }, button: { alignItems: 'center', backgroundColor: theme.colors.accent, borderRadius: theme.radius.control, justifyContent: 'center', minHeight: 54, marginTop: theme.spacing.lg }, buttonText: { color: theme.colors.onAccent, fontSize: 16, fontWeight: '800' }, card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, borderWidth: 1, padding: theme.spacing.lg }, cardLabel: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 }, cardValue: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' }, question: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: '700', lineHeight: 24, marginTop: theme.spacing.md }, choice: { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.control, borderWidth: 1, padding: theme.spacing.lg }, choiceSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.accentSoft }, choiceText: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' }, error: { color: theme.colors.danger, lineHeight: 20, marginTop: theme.spacing.md }, disabled: { opacity: 0.55 } });
