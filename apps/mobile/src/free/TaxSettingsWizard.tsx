import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { loadTaxSettings, saveTaxSettings, settingsForMonth, type TaxSettings } from "./taxSettings";

const fields = [
  ["priorYearRevenueMinor", "Przychód za poprzedni rok (PLN)"],
] as const;
type AmountField = typeof fields[number][0];
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const toDisplay = (minor: string) => {
  const value = BigInt(minor);
  return `${value/100n},${(value%100n).toString().padStart(2,"0")}`;
};
const toMinor = (value: string): string => {
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(value.trim())) throw Error("Wpisz poprawną kwotę PLN");
  const [whole, cents = ""] = value.trim().replace(",", ".").split(".");
  return (BigInt(whole!) * 100n + BigInt(cents.padEnd(2, "0"))).toString();
};
export function TaxSettingsWizard({ nip }: { nip: string }) {
  const [history, setHistory] = useState<TaxSettings[]>([]);
  const [month, setMonth] = useState(thisMonth);
  const [step, setStep] = useState(0);
  const [jdgActive, setJdgActive] = useState(true);
  const [qualifyingUop, setQualifyingUop] = useState(false);
  const [voluntarySickness, setVoluntarySickness] = useState(false);
  const [values, setValues] = useState<Record<AmountField,string>>({
    priorYearRevenueMinor: "",
  });
  const [error, setError] = useState<string|null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    void loadTaxSettings(nip).then(v => { if (active) { setHistory(v); if (!v.length) setMonth("2026-01"); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Nie można odczytać ustawień"); });
    return () => { active = false; };
  }, [nip]);
  const effective = settingsForMonth(history, month);
  function copyPrevious() {
    if (!effective) return;
    setValues({
      priorYearRevenueMinor: toDisplay(effective.priorYearRevenueMinor),
    });
    setJdgActive(effective.jdgActive ?? true);
    setQualifyingUop(effective.qualifyingUop ?? false);
    setVoluntarySickness(effective.voluntarySickness ?? false);
    setSaved(false);
  }
  async function submit() {
    setError(null);
    try {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < "2026-01") throw Error("Miesiąc musi być od 2026-01");
      if (history.some(s => s.effectiveFrom === month)) throw Error("Ten miesiąc ma już zapisane ustawienia. Wybierz nowy miesiąc obowiązywania.");
      const settings: TaxSettings = { effectiveFrom: month, ryczaltRate: "12", vatPayer: true, settlement: "monthly",
        priorYearRevenueMinor: toMinor(values.priorYearRevenueMinor),
        openingVatMinor: "0", paidZusSocialMinor: "0", paidZusHealthMinor: "0",
        jdgActive, qualifyingUop, voluntarySickness };
      await saveTaxSettings(nip, settings);
      setHistory(await loadTaxSettings(nip));
      setSaved(true);
      setStep(0);
    } catch (e) { setError(e instanceof Error ? e.message : "Nie można zapisać ustawień"); }
  }
  const [key, label] = fields[step]!;
  return <View style={styles.container}>
    <Text style={styles.heading}>Ustawienia podatkowe</Text>
    <Text style={styles.hint}>JDG • ryczałt 12% • czynny VAT • rozliczenie miesięczne</Text>
    <Text style={styles.label}>Obowiązuje od miesiąca (RRRR-MM)</Text>
    <TextInput accessibilityLabel="Obowiązuje od" style={styles.input} value={month} onChangeText={v => {setMonth(v);setSaved(false);}} placeholder="2026-11" />
    {effective ? <Text style={styles.hint}>Dla wybranego miesiąca obowiązuje wersja od {effective.effectiveFrom}. Nowa wersja nie zmienia wcześniejszych miesięcy.</Text> : <Text style={styles.hint}>Brak wcześniejszych ustawień. Uzupełnij dane początkowe.</Text>}
    <Pressable accessibilityRole="button" onPress={copyPrevious} disabled={!effective} style={styles.link}><Text style={styles.action}>Skopiuj stałe dane (bez składek i VAT)</Text></Pressable>
    <Text style={styles.heading}>Krok {step+1} z {fields.length}</Text>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} style={styles.input} keyboardType="decimal-pad" value={values[key]}
      onChangeText={v => {setValues(old => ({...old,[key]:v}));setSaved(false);}} placeholder="0,00" />
    <Text style={styles.hint}>Te ustawienia obowiązują od wskazanego miesiąca. Zapłacone składki i VAT wprowadza się oddzielnie w danych miesiąca.</Text>
    <Pressable accessibilityRole="button" onPress={() => setJdgActive(v => !v)} style={styles.link}><Text style={styles.action}>JDG aktywna: {jdgActive ? "Tak" : "Nie"}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => {setQualifyingUop(v=>!v); setVoluntarySickness(false);}} style={styles.link}><Text style={styles.action}>UoP z ubezpieczeniem głównym: {qualifyingUop ? "Tak" : "Nie"}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => setVoluntarySickness(v=>!v)} disabled={!jdgActive || qualifyingUop} style={styles.link}><Text style={styles.action}>Dobrowolne chorobowe: {voluntarySickness ? "Tak" : "Nie"}</Text></Pressable>
    <View style={styles.row}>
      {step > 0 ? <Pressable accessibilityRole="button" onPress={() => setStep(s => s-1)} style={styles.link}><Text style={styles.action}>Wstecz</Text></Pressable> : null}
      {step < fields.length-1 ? <Pressable accessibilityRole="button" onPress={() => setStep(s => s+1)} style={styles.link}><Text style={styles.action}>Dalej</Text></Pressable>
      : <Pressable accessibilityRole="button" onPress={() => void submit()} style={styles.link}><Text style={styles.action}>Zapisz od {month}</Text></Pressable>}
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {saved ? <Text accessibilityRole="alert">Zapisano nową wersję ustawień.</Text> : null}
    <Text style={styles.heading}>Historia ustawień</Text>
    {history.length ? history.map(v => <Text key={v.effectiveFrom} style={styles.hint}>Od {v.effectiveFrom} • 12% • VAT miesięczny</Text>) : <Text style={styles.hint}>Brak zapisanych wersji</Text>}
  </View>;
}
const styles = StyleSheet.create({
  container: {gap:12}, heading:{fontSize:17,fontWeight:"700",color:"#132a48"},
  label:{fontWeight:"600",color:"#132a48"},hint:{color:"#64748b",lineHeight:21},
  input:{borderWidth:1,borderColor:"#cbd5e1",borderRadius:10,padding:12,backgroundColor:"white"},
  link:{paddingVertical:12,paddingHorizontal:8},action:{fontWeight:"700",color:"#1565c0"},
  row:{flexDirection:"row",justifyContent:"space-between"},error:{color:"#b91c1c"},
});
