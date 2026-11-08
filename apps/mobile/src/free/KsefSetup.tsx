import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  deleteKsefToken,
  loadKsefCredentialMetadata,
  saveKsefToken,
  type KsefCredentialMetadata,
} from "./ksefCredentials";

export function KsefSetup({ nip }: { nip: string }) {
  const [token, setToken] = useState("");
  const [metadata, setMetadata] = useState<KsefCredentialMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setMetadata(null);
    setError(null);
    void loadKsefCredentialMetadata(nip).then((value) => {
      if (live) setMetadata(value);
    }).catch(() => {
      if (live) setError("Nie można odczytać bezpiecznego magazynu danych KSeF.");
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [nip]);

  async function save() {
    if (!token.trim() || saving || loading) return;
    setSaving(true);
    setError(null);
    try {
      setMetadata(await saveKsefToken(nip, token));
      setToken("");
    } catch {
      setError("Nie udało się bezpiecznie zapisać tokenu. Nie jest on aktywny.");
    } finally { setSaving(false); }
  }

  function disconnect() {
    Alert.alert("Usuń token KSeF?", "Token zostanie usunięty z tego urządzenia. Nie zostanie unieważniony w systemie KSeF.", [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => {
        void deleteKsefToken().then(() => { setMetadata(null); setToken(""); setError(null); })
          .catch(() => setError("Nie udało się usunąć tokenu."));
      } },
    ]);
  }

  return <View style={styles.container}>
    <Text style={styles.title}>Dostęp do KSeF</Text>
    <Text style={styles.help}>Utwórz token z uprawnieniem <Text style={styles.strong}>InvoiceRead</Text> dla NIP {nip} w oficjalnym systemie KSeF. Nie nadaj aplikacji uprawnień do wystawiania faktur.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {loading ? <Text>Sprawdzanie bezpiecznego magazynu…</Text> : null}
    {metadata && !loading ? <>
      <Text style={styles.ok}>Token zapisany na urządzeniu dla NIP {metadata.nip}</Text>
      <Text style={styles.help}>Zapisano: {new Date(metadata.savedAt).toLocaleDateString("pl-PL")}. Token nie został jeszcze sprawdzony w KSeF.</Text>
      <Pressable accessibilityRole="button" onPress={disconnect} style={styles.buttonAlt}><Text style={styles.red}>Usuń token z urządzenia</Text></Pressable>
    </> : null}
    {!loading ? <>
      <Text style={styles.strong}>{metadata ? "Zastąp zapisany token" : "Token KSeF"}</Text>
      <TextInput style={styles.input} accessibilityLabel="Token KSeF" autoCapitalize="none"
        autoCorrect={false} textContentType="password" secureTextEntry
        value={token} onChangeText={setToken} placeholder="Wklej token KSeF" editable={!saving} />
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || !token.trim() }}
        disabled={saving || !token.trim()} style={[styles.button, (saving || !token.trim()) && styles.disabled]}
        onPress={() => void save()}><Text style={styles.buttonText}>Zapisz bezpiecznie</Text></Pressable>
    </> : null}
    <Text style={styles.warn}>Odczyt faktur nie jest jeszcze aktywny. Zapisanie tokenu nie oznacza połączenia ani jego weryfikacji. Do uruchomienia synchronizacji potrzebne będzie zgodne z KSeF 2.0 uwierzytelnienie RSA-OAEP.</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingTop: 12 },
  title: { fontSize: 18, fontWeight: "700", color: "#132a48" },
  help: { color: "#64748b", lineHeight: 21 },
  strong: { fontWeight: "700", color: "#132a48" },
  input: { borderRadius: 12, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "white", padding: 14 },
  button: { padding: 14, alignItems: "center", backgroundColor: "#1565c0", borderRadius: 12 },
  buttonText: { color: "white", fontWeight: "700" },
  buttonAlt: { paddingVertical: 10 },
  disabled: { opacity: 0.45 },
  red: { color: "#b91c1c", fontWeight: "700" },
  ok: { color: "#047857", fontWeight: "600" },
  warn: { color: "#92400e", lineHeight: 21 },
  error: { color: "#b91c1c", fontWeight: "600" },
});
