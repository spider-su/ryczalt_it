import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { loadMonthlyTaxFacts, saveMonthlyTaxFacts } from "./monthlyTaxFacts";

const current = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
function minor(value: string): string {
  const clean = value.trim().replace(",", ".");
  if (!/^\\d+(?:\\.\\d{1,2})?$/.test(clean)) throw new Error("Wprowadź potwierdzoną kwotę PLN (lub 0)");
  const [whole, cents = ""] = clean.split(".");
  return (BigInt(whole!) * 100n + BigInt(cents.padEnd(2, "0"))).toString();
}
function display(value: string): string {
  const n = BigInt(value);
  return `${n / 100n},${(n % 100n).toString().padStart(2,"0")}`;
}
export function MonthlyTaxFactsEditor({ nip }: { nip: string }) {
  const [month, setMonth] = useState(current);
  const [vat, setVat] = useState("");
  const [social, setSocial] = useState("");
  const [health, setHealth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let live = true;
    setVat(""); setSocial(""); setHealth(""); setSaved(false); setError(null);
    void loadMonthlyTaxFacts(nip, month).then(f => {
      if (live && f) { setVat(display(f.openingVatMinor)); setSocial(display(f.paidZusSocialMinor)); setHealth(display(f.paidZusHealthMinor)); }
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : "Błąd odczytu"); });
    return () => { live = false; };
  }, [nip, month]);
  async function save() {
    setError(null); setSaved(false);
    try {
      await saveMonthlyTaxFacts(nip, { month, openingVatMinor: minor(vat), paidZusSocialMinor: minor(social), paidZusHealthMinor: minor(health) });
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Nie można zapisać danych"); }
  }
  return <View style={{gap:10,marginTop:20}}>
    <Text style={{fontWeight:"700",fontSize:17}}>Dane księgowe miesiąca</Text>
    <Text>Te kwoty dotyczą tylko wskazanego miesiąca. Nie są kopiowane na następne okresy.</Text>
    <Text>Miesiąc (RRRR-MM)</Text>
    <TextInput accessibilityLabel="Miesiąc danych podatkowych" value={month} onChangeText={setMonth} style={{borderWidth:1,borderRadius:8,padding:10}} />
    <Text>Potwierdzone saldo VAT do przeniesienia (PLN)</Text>
    <TextInput accessibilityLabel="Saldo VAT" value={vat} onChangeText={setVat} keyboardType="decimal-pad" style={{borderWidth:1,borderRadius:8,padding:10}} />
    <Text>Zapłacone składki społeczne w miesiącu (PLN)</Text>
    <TextInput accessibilityLabel="Składki społeczne" value={social} onChangeText={setSocial} keyboardType="decimal-pad" style={{borderWidth:1,borderRadius:8,padding:10}} />
    <Text>Zapłacona składka zdrowotna w miesiącu (PLN)</Text>
    <TextInput accessibilityLabel="Składka zdrowotna" value={health} onChangeText={setHealth} keyboardType="decimal-pad" style={{borderWidth:1,borderRadius:8,padding:10}} />
    <Text>Puste pole oznacza brak danych, nie zero. Wpisz 0 tylko po potwierdzeniu.</Text>
    <Pressable accessibilityRole="button" onPress={() => void save()} style={{padding:14,backgroundColor:"#dbeafe",borderRadius:8}}><Text style={{color:"#1565c0",fontWeight:"700"}}>Zapisz dane miesiąca</Text></Pressable>
    {error ? <Text accessibilityRole="alert" style={{color:"#b91c1c"}}>{error}</Text> : null}
    {saved ? <Text accessibilityRole="alert">Zapisano dane dla {month}</Text> : null}
  </View>;
}
