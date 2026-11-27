import { useEffect, useState } from "react";
import { readInvoiceLedger } from "./jsonInvoiceLedger";
import { synchronizeKsefHistory } from "./synchronizeKsefHistory";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { InvoiceLedger } from "./invoiceLedger";
import { summarizeKsefMonth } from "./monthlyInvoiceSummary";
import { loadTaxSettings, type TaxSettings } from "./taxSettings";
import { estimateCompleteTaxes, monthsSince2026, type CompleteTaxEstimate } from "./completeTaxEstimate";
import { loadMonthlyTaxFacts, type MonthlyTaxFacts } from "./monthlyTaxFacts";

export function monthOffset(month: string, delta: number): string {
  const [year, number] = month.split("-").map(Number);
  if (!year || !number || number < 1 || number > 12) throw new Error("Invalid month");
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}
export function LocalAccountingOverview({ nip, mode }: { nip: string; mode: "invoices" | "taxes" }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [ledger, setLedger] = useState<InvoiceLedger>({ taxpayerNip: nip, invoices: [] });
  const [taxSettings, setTaxSettings] = useState<TaxSettings[]>([]);
  const [factsHistory, setFactsHistory] = useState<Record<string, MonthlyTaxFacts | null>>({});
  const [factsMonth, setFactsMonth] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [direction, setDirection] = useState<"all" | "issued" | "received">("all");
  const [loadedNip, setLoadedNip] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoadedNip(null);
    setLedger({ taxpayerNip: nip, invoices: [] });
    setLoadError(null);
    void Promise.all([readInvoiceLedger(nip), loadTaxSettings(nip)]).then(([saved, settings]) => { if (active) { setLedger(saved); setTaxSettings(settings); setLoadedNip(nip); } })
      .catch(() => { if (active) setLoadError("Nie można odczytać zapisanych faktur."); });
    return () => { active = false; };
  }, [nip]);
  useEffect(() => {
    let live = true;
    setFactsHistory({});
    setFactsMonth(null);
    const months = month >= "2026-01" ? monthsSince2026(month) : [];
    void Promise.all(months.map(async m => [m, await loadMonthlyTaxFacts(nip, m)] as const))
      .then(rows => { if (live) { setFactsHistory(Object.fromEntries(rows)); setFactsMonth(month); } })
      .catch(() => { if (live) setLoadError("Nie można odczytać danych podatkowych miesiąca."); });
    return () => { live = false; };
  }, [nip, month]);
  async function sync() {
    if (syncing) return;
    setSyncing(true);
    setSyncError(null);
    try { await synchronizeKsefHistory(nip, (current, total, target) => setSyncProgress(`Synchronizacja ${current}/${total}: ${target}`)); setLedger(await readInvoiceLedger(nip)); }
    catch {
      try { setLedger(await readInvoiceLedger(nip)); setSyncError("Nie udało się ukończyć synchronizacji. Zapisane faktury pozostają dostępne; ponów próbę."); }
      catch { setLoadedNip(null); setLoadError("Nie można odczytać zapisanych faktur."); }
    }
    finally { setSyncProgress(null); setSyncing(false); }
  }
  const summary = summarizeKsefMonth(ledger, month);
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const historicalPaid = month >= "2026-01" && month < currentMonth;
  const formatSync = (value: string) => new Date(value).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });
  const estimate: CompleteTaxEstimate = month >= "2026-01" && factsMonth === month
    ? estimateCompleteTaxes(ledger, taxSettings, month, factsHistory)
    : { missing: ["Wczytywanie danych księgowych miesiąca"] };
  const monthly = ledger.invoices.filter((invoice) => invoice.issueDate.startsWith(month));
  const visible = monthly.filter((invoice) => direction === "all" || invoice.direction === direction);
  const money = (minor: string, currency: string) => {
    const amount = BigInt(minor); const absolute = amount < 0n ? -amount : amount;
    return `${amount < 0n ? "-" : ""}${(absolute / 100n).toString()},${(absolute % 100n).toString().padStart(2, "0")} ${currency}`;
  };
  return <View style={styles.container}>
    <View style={styles.monthRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Poprzedni miesiąc" onPress={() => setMonth((m) => monthOffset(m, -1))} style={styles.nav}><Text>‹</Text></Pressable>
      <Text style={styles.title}>{month}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Następny miesiąc" onPress={() => setMonth((m) => monthOffset(m, 1))} style={styles.nav}><Text>›</Text></Pressable>
    </View>
    {loadError ? <Text accessibilityRole="alert" style={styles.muted}>{loadError}</Text> : null}
    {syncError ? <Text accessibilityRole="alert" style={styles.muted}>{syncError}</Text> : null}
    {loadedNip === nip && !loadError ? (mode === "invoices" ? <>
      <Text style={styles.title}>Faktury z KSeF</Text>
      <Pressable accessibilityRole="button" disabled={syncing} onPress={() => void sync()} style={styles.nav}><Text>{syncing ? "Synchronizacja…" : "Synchronizuj wszystkie faktury"}</Text></Pressable>
      {syncProgress ? <Text style={styles.muted}>{syncProgress}</Text> : null}
      <View style={styles.metrics}><View style={styles.metric}><Text style={styles.muted}>Sprzedaż</Text><Text style={styles.title}>{summary.issuedCount}</Text></View><View style={styles.metric}><Text style={styles.muted}>Zakupy</Text><Text style={styles.title}>{summary.receivedCount}</Text></View></View>
      <View style={styles.filters}>{([["all", "Wszystkie"], ["issued", "Sprzedaż"], ["received", "Zakupy"]] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: direction === value }} onPress={() => setDirection(value)} style={[styles.filter, direction === value && styles.activeFilter]}><Text style={direction === value ? styles.activeText : styles.muted}>{label}</Text></Pressable>)}</View>
      <Text style={styles.muted}>{ledger.synchronizedMonths?.[month] ? `Ostatnia synchronizacja tego miesiąca: ${formatSync(ledger.synchronizedMonths[month])}` : "Synchronizacja nie została wykonana. Brak lokalnych faktur nie oznacza braku faktur w KSeF."}</Text>
      {visible.length === 0 ? <Text style={styles.muted}>Brak zapisanych faktur dla wybranego miesiąca i filtra.</Text> : visible.map((invoice) => <View key={invoice.ksefId} style={styles.invoiceRow}><View style={styles.row}><Text style={styles.title}>{invoice.direction === "issued" ? "Sprzedaż" : "Zakup"}</Text><Text style={styles.amount}>{money(invoice.grossMinor, invoice.currency)}</Text></View><Text style={styles.muted}>{invoice.issueDate} • {invoice.kind === "correction" ? "Korekta" : "Faktura"}</Text><Text style={styles.muted} numberOfLines={1}>KSeF: {invoice.ksefId}</Text><Text style={styles.muted}>Netto: {money(invoice.netMinor, invoice.currency)} • VAT: {money(invoice.vatMinor, invoice.currency)}</Text></View>)}
    </> : <>
      <Text style={styles.title}>Gotowość rozliczenia</Text>
      {historicalPaid ? <Text style={styles.muted}>Poprzedni miesiąc: podatki i składki uznane za opłacone zgodnie z przyjętym założeniem. Nie zwiększają bieżących zaległości.</Text> : null}
      <View style={styles.metrics}>{(["PIT", "VAT", "ZUS"] as const).map((label) => <View key={label} style={styles.metric}><Text style={styles.muted}>{label}</Text><Text style={styles.title}>{label === "PIT" && "pitPayablePln" in estimate && estimate.pitPayablePln !== undefined ? `${estimate.pitPayablePln} PLN` : label === "VAT" && "vatPayablePln" in estimate && estimate.vatPayablePln !== undefined ? `${estimate.vatPayablePln} PLN` : label === "ZUS" && "zusPayableMinor" in estimate && estimate.zusPayableMinor !== undefined ? `${(BigInt(estimate.zusPayableMinor)/100n).toString()},${(BigInt(estimate.zusPayableMinor)%100n).toString().padStart(2,"0")} PLN` : "—"}</Text><Text style={styles.muted}>{estimate.missing.length === 0 ? "Szacunek" : "Wymaga danych"}</Text></View>)}</View>
      <Text style={styles.muted}>Podsumowanie KSeF: {summary.issuedCount} sprzedaży, {summary.receivedCount} zakupów.</Text>
      {estimate.vatCarryForwardPln !== undefined ? <Text style={styles.muted}>VAT do przeniesienia: {estimate.vatCarryForwardPln} PLN</Text> : null}
      <Text style={styles.muted}>Szacunki PIT, VAT i ZUS na podstawie danych KSeF i ustawień. Weryfikuj daty podatkowe, odliczenia oraz faktycznie zapłacone składki.</Text>
      {estimate.missing.map((reason) => <Text key={reason} style={styles.muted}>• {reason}</Text>)}
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
  metrics: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: 12, padding: 12, gap: 5 },
  filters: { flexDirection: "row", gap: 8 },
  filter: { flex: 1, alignItems: "center", padding: 9, borderRadius: 10, backgroundColor: "#f1f5f9" },
  activeFilter: { backgroundColor: "#dbeafe" },
  activeText: { color: "#1565c0", fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  amount: { fontWeight: "700", color: "#1565c0", fontSize: 16 },
  invoiceRow: { borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 10, gap: 4 },
});
