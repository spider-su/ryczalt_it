import { useEffect, useState } from "react";
import { readSecureLedger } from "./secureInvoiceLedger";
import { synchronizeKsefMonth } from "./synchronizeKsefMonth";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { assessTaxReadiness, type InvoiceLedger } from "./invoiceLedger";
import { summarizeKsefMonth } from "./monthlyInvoiceSummary";

export function monthOffset(month: string, delta: number): string {
  const [year, number] = month.split("-").map(Number);
  if (!year || !number || number < 1 || number > 12) throw new Error("Invalid month");
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}
export function LocalAccountingOverview({ nip, mode }: { nip: string; mode: "invoices" | "taxes" }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  // No import adapter is wired yet. Do not claim that an empty ledger was synchronized.
  const [ledger, setLedger] = useState<InvoiceLedger>({ taxpayerNip: nip, invoices: [] });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loadedNip, setLoadedNip] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoadedNip(null);
    setLedger({ taxpayerNip: nip, invoices: [] });
    setLoadError(null);
    void readSecureLedger(nip).then((saved) => { if (active) { setLedger(saved); setLoadedNip(nip); } })
      .catch(() => { if (active) setLoadError("Nie można odczytać zaszyfrowanych faktur."); });
    return () => { active = false; };
  }, [nip]);
  async function sync() {
    if (syncing) return;
    setSyncing(true);
    setLoadError(null);
    try { setLedger(await synchronizeKsefMonth(nip, month)); }
    catch { setLoadError("Nie udało się ukończyć synchronizacji. Poprzednie dane pozostają zapisane; sprawdź token i połączenie."); }
    finally { setSyncing(false); }
  }
  const summary = summarizeKsefMonth(ledger, month);
  const readiness = assessTaxReadiness(ledger, month, {});
  return <View style={styles.container}>
    <View style={styles.monthRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Poprzedni miesiąc" onPress={() => setMonth((m) => monthOffset(m, -1))} style={styles.nav}><Text>‹</Text></Pressable>
      <Text style={styles.title}>{month}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Następny miesiąc" onPress={() => setMonth((m) => monthOffset(m, 1))} style={styles.nav}><Text>›</Text></Pressable>
    </View>
    {loadError ? <Text accessibilityRole="alert" style={styles.muted}>{loadError}</Text> : null}
    {loadedNip === nip && !loadError ? (mode === "invoices" ? <>
      <Text style={styles.title}>Faktury z KSeF</Text>
      <Pressable accessibilityRole="button" disabled={syncing} onPress={() => void sync()} style={styles.nav}><Text>{syncing ? "Synchronizacja…" : "Synchronizuj z KSeF"}</Text></Pressable>
      <Text>Sprzedaż: {summary.issuedCount} • Zakupy: {summary.receivedCount}</Text>
      <Text style={styles.muted}>{ledger.lastSuccessfulSync ? `Ostatnia synchronizacja: ${ledger.lastSuccessfulSync}` : "Synchronizacja nie została wykonana. Brak lokalnych faktur nie oznacza braku faktur w KSeF."}</Text>
      {ledger.invoices.filter((invoice) => invoice.issueDate.startsWith(month)).map((invoice) => <View key={invoice.ksefId} style={styles.invoiceRow}><Text>{invoice.direction === "issued" ? "Sprzedaż" : "Zakup"} • {invoice.issueDate}</Text><Text>{invoice.grossMinor} / 100 {invoice.currency} • {invoice.ksefId}</Text></View>)}
    </> : <>
      <Text style={styles.title}>Gotowość rozliczenia</Text>
      <Text style={styles.muted}>PIT, VAT i ZUS: brak wyliczenia (nie 0 zł).</Text>
      {readiness.missing.map((reason) => <Text key={reason} style={styles.muted}>• {reason}</Text>)}
      <Text style={styles.muted}>Podsumowanie faktur jest informacyjne, nie stanowi deklaracji podatkowej.</Text>
    </>) : !loadError ? <Text style={styles.muted}>Wczytywanie faktur…</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 12, paddingVertical: 14 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nav: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#e2e8f0", borderRadius: 10 },
  title: { fontWeight: "700", fontSize: 17, color: "#132a48" },
  muted: { color: "#64748b", lineHeight: 21 },
  invoiceRow: { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 10, gap: 4 },
});
