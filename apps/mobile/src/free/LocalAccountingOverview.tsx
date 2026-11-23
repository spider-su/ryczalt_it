import { useEffect, useState } from "react";
import { readSecureLedger } from "./secureInvoiceLedger";
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
  useEffect(() => {
    let active = true;
    setLedger({ taxpayerNip: nip, invoices: [] });
    setLoadError(null);
    void readSecureLedger(nip).then((saved) => { if (active) setLedger(saved); })
      .catch(() => { if (active) setLoadError("Nie można odczytać zaszyfrowanych faktur."); });
    return () => { active = false; };
  }, [nip]);
  const summary = summarizeKsefMonth(ledger, month);
  const readiness = assessTaxReadiness(ledger, month, {});
  return <View style={styles.container}>
    <View style={styles.monthRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Poprzedni miesiąc" onPress={() => setMonth((m) => monthOffset(m, -1))} style={styles.nav}><Text>‹</Text></Pressable>
      <Text style={styles.title}>{month}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Następny miesiąc" onPress={() => setMonth((m) => monthOffset(m, 1))} style={styles.nav}><Text>›</Text></Pressable>
    </View>
    {loadError ? <Text accessibilityRole="alert" style={styles.muted}>{loadError}</Text> : null}
    {mode === "invoices" ? <>
      <Text style={styles.title}>Faktury z KSeF</Text>
      <Text>Sprzedaż: {summary.issuedCount} • Zakupy: {summary.receivedCount}</Text>
      <Text style={styles.muted}>{ledger.lastSuccessfulSync ? `Ostatnia synchronizacja: ${ledger.lastSuccessfulSync}` : "Synchronizacja nie została wykonana. Brak lokalnych faktur nie oznacza braku faktur w KSeF."}</Text>
      <Text style={styles.muted}>Kwoty i szczegóły pojawią się dopiero po uruchomieniu bezpiecznego importu KSeF.</Text>
    </> : <>
      <Text style={styles.title}>Gotowość rozliczenia</Text>
      <Text style={styles.muted}>PIT, VAT i ZUS: brak wyliczenia (nie 0 zł).</Text>
      {readiness.missing.map((reason) => <Text key={reason} style={styles.muted}>• {reason}</Text>)}
      <Text style={styles.muted}>Podsumowanie faktur jest informacyjne, nie stanowi deklaracji podatkowej.</Text>
    </>}
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 12, paddingVertical: 14 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nav: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#e2e8f0", borderRadius: 10 },
  title: { fontWeight: "700", fontSize: 17, color: "#132a48" },
  muted: { color: "#64748b", lineHeight: 21 },
});
