import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { VatCompany } from "./nip";
import { lookupCompanyByNip, validNip } from "./nip";
import { loadCompany, removeCompany, saveCompany } from "./localCompany";
import { deleteKsefToken } from "./ksefCredentials";
import { KsefSetup } from "./KsefSetup";

type Screen = "company" | "invoices" | "taxes";
const BACKGROUND = "#f7f9fc";
const PRIMARY = "#1565c0";

export function FreeMobileApp() {
  return (
    <SafeAreaProvider>
      <FreeContent />
    </SafeAreaProvider>
  );
}

function FreeContent() {
  const [company, setCompany] = useState<VatCompany | null>(null);
  const [candidate, setCandidate] = useState<VatCompany | null>(null);
  const [nip, setNip] = useState("");
  const [screen, setScreen] = useState<Screen>("company");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadCompany().then((saved) => {
      if (live) {
        setCompany(saved);
        if (saved) setNip(saved.nip);
      }
    }).catch((reason: unknown) => {
      if (live) setError(reason instanceof Error ? reason.message : "Nie można wczytać danych firmy.");
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function search() {
    setError(null);
    setCandidate(null);
    setBusy(true);
    try { setCandidate(await lookupCompanyByNip(nip)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Nie udało się pobrać danych."); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!candidate || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (company && company.nip !== candidate.nip) {
        // Remove the old company credential before changing the active identity.
        await deleteKsefToken();
      }
      await saveCompany(candidate);
      setCompany(candidate);
      setCandidate(null);
      setNip(candidate.nip);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie można zapisać firmy.");
    } finally { setBusy(false); }
  }

  function erase() {
    Alert.alert("Usuń dane firmy?", "Spowoduje to usunięcie lokalnie zapisanego profilu firmy.", [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => {
        void deleteKsefToken().then(removeCompany).then(() => { setCompany(null); setCandidate(null); setNip(""); setError(null); })
          .catch(() => setError("Nie udało się usunąć danych."));
      } },
    ]);
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>Ryczałt IT</Text>
        <Text style={styles.subtitle}>Darmowy asystent podatkowy • dane na telefonie</Text>
      </View>
      <View style={styles.tabs}>
        <Tab label="Firma" selected={screen === "company"} onPress={() => setScreen("company")} />
        <Tab label="Faktury" selected={screen === "invoices"} onPress={() => setScreen("invoices")} />
        <Tab label="Podatki" selected={screen === "taxes"} onPress={() => setScreen("taxes")} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {!loading && screen === "company" ? (
          <>
            <Text style={styles.heading}>Twoja firma</Text>
            <Text style={styles.muted}>Wpisz NIP, aby pobrać dane z oficjalnego Wykazu podatników VAT Ministerstwa Finansów. Nie jest to logowanie ani potwierdzenie uprawnień do firmy.</Text>
            <Text style={styles.label}>NIP</Text>
            <TextInput accessibilityLabel="NIP" style={styles.input} keyboardType="number-pad" maxLength={13}
              value={nip} onChangeText={(value) => { setNip(value); setCandidate(null); setError(null); }} placeholder="1234567890" editable={!busy} />
            <Action label={busy ? "Pobieranie…" : "Pobierz dane firmy"} disabled={busy || !validNip(nip)} onPress={() => void search()} />
            {candidate ? (
              <View style={styles.card}>
                <Text style={styles.heading}>Potwierdź dane</Text>
                <CompanyDetails company={candidate} />
                <Action label="Zapisz firmę na urządzeniu" disabled={busy} onPress={() => void confirm()} />
              </View>
            ) : null}
            {company ? (
              <View style={styles.card}>
                <Text style={styles.heading}>Zapisana firma</Text>
                <CompanyDetails company={company} />
                <Pressable accessibilityRole="button" onPress={erase} style={styles.link}><Text style={styles.danger}>Usuń lokalny profil</Text></Pressable>
              </View>
            ) : null}
          </>
        ) : null}
        {!loading && screen === "invoices" ? (
          <View style={styles.card}>
            <Text style={styles.heading}>Faktury KSeF</Text>
            <Text style={styles.muted}>{company ? `Firma: ${company.name} (NIP ${company.nip})` : "Najpierw potwierdź NIP na karcie Firma."}</Text>
            {company ? <KsefSetup nip={company.nip} /> : null}
          </View>
        ) : null}
        {!loading && screen === "taxes" ? (
          <View style={styles.card}>
            <Text style={styles.heading}>Podatki miesięczne</Text>
            <Text style={styles.note}>Obliczenia PIT, VAT i ZUS będą wykonywane na urządzeniu po przeniesieniu i przetestowaniu reguł z backendu. Bez faktur, klasyfikacji i sald początkowych nie można bezpiecznie wyliczyć zobowiązań.</Text>
            <Text style={styles.muted}>Brak wyliczenia nie oznacza podatku 0 zł.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.tab, selected && styles.tabActive]}><Text style={[styles.tabText, selected && styles.tabTextActive]}>{label}</Text></Pressable>;
}
function Action({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
function CompanyDetails({ company }: { company: VatCompany }) {
  return <View style={styles.details}>
    <Text style={styles.companyName}>{company.name}</Text>
    <Text>NIP: {company.nip}</Text>
    {company.regon ? <Text>REGON: {company.regon}</Text> : null}
    <Text>Status VAT: {company.statusVat ?? "brak danych"}</Text>
    {company.workingAddress || company.residenceAddress ? <Text>Adres: {company.workingAddress ?? company.residenceAddress}</Text> : null}
    <Text style={styles.muted}>Źródło: Wykaz podatników VAT • {new Date(company.retrievedAt).toLocaleDateString("pl-PL")}</Text>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  brand: { fontSize: 26, fontWeight: "800", color: "#132a48" },
  subtitle: { fontSize: 12, color: "#64748b", marginTop: 4 },
  tabs: { flexDirection: "row", borderBottomColor: "#dbe3ef", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14 },
  tabActive: { borderBottomColor: PRIMARY, borderBottomWidth: 3 },
  tabText: { fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: PRIMARY },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  heading: { fontSize: 19, fontWeight: "700", color: "#132a48", marginBottom: 8 },
  muted: { color: "#64748b", lineHeight: 21, fontSize: 14 },
  note: { color: "#475569", lineHeight: 24, marginTop: 12 },
  label: { fontWeight: "600", color: "#132a48" },
  input: { backgroundColor: "white", borderColor: "#cbd5e1", borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 18 },
  button: { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 10 },
  disabled: { opacity: 0.45 },
  buttonText: { color: "white", fontWeight: "700" },
  card: { backgroundColor: "white", borderRadius: 15, padding: 18, marginTop: 8, borderColor: "#e2e8f0", borderWidth: 1 },
  details: { gap: 8 },
  companyName: { fontWeight: "700", fontSize: 17, marginBottom: 4 },
  error: { color: "#b91c1c", fontWeight: "600", padding: 10, backgroundColor: "#fee2e2", borderRadius: 8 },
  danger: { color: "#b91c1c", fontWeight: "600" },
  link: { paddingVertical: 14, marginTop: 6 },
});
