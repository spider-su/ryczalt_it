import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  deleteKsefToken,
  loadKsefCredentialMetadata,
  saveKsefToken,
  getKsefTokenForAuthentication,
  type KsefCredentialMetadata,
} from "./ksefCredentials";
import { KsefAuthClient } from "./ksefAuth";
import { KsefAndroidEncryptor } from "./ksefNativeEncryption";

export function KsefSetup({ nip }: { nip: string }) {
  const [token, setToken] = useState("");
  const [metadata, setMetadata] = useState<KsefCredentialMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setMetadata(null);
    setVerified(false);
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
      setVerified(false);
      setToken("");
    } catch {
      setError("Nie udało się bezpiecznie zapisać tokenu. Nie jest on aktywny.");
    } finally { setSaving(false); }
  }

  async function verifyConnection() {
    if (verifying || loading || !metadata) return;
    setVerifying(true);
    setError(null);
    setVerified(false);
    try {
      const savedToken = await getKsefTokenForAuthentication(nip);
      if (!savedToken) throw new Error("Nie znaleziono zapisanego tokenu.");
      // Only official production KSeF endpoints; auth tokens stay in memory and
      // are discarded immediately. Do not persist API JWTs or log exceptions.
      const auth = new KsefAuthClient("production", new KsefAndroidEncryptor());
      await auth.authenticate(nip, savedToken);
      setVerified(true);
    } catch {
      setError("KSeF nie potwierdził połączenia. Sprawdź token, uprawnienia oraz dostępność systemu.");
    } finally { setVerifying(false); }
  }

  function disconnect() {
    Alert.alert("Usuń token KSeF?", "Token zostanie usunięty z tego urządzenia. Nie zostanie unieważniony w systemie KSeF.", [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => {
        void deleteKsefToken().then(() => { setMetadata(null); setToken(""); setVerified(false); setError(null); })
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
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: verifying }}
        disabled={verifying} onPress={() => void verifyConnection()} style={styles.button}>
        <Text style={styles.buttonText}>{verifying ? "Sprawdzanie połączenia…" : "Sprawdź połączenie z KSeF"}</Text>
      </Pressable>
      {verified ? <Text style={styles.ok}>Uwierzytelnienie KSeF zakończone pomyślnie w tej sesji. Uprawnienia odczytu faktur nie zostały jeszcze sprawdzone.</Text> : null}
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
    <Text style={styles.warn}>Odczyt i synchronizacja faktur nie są jeszcze aktywne. Możesz jedynie przetestować uwierzytelnienie w środowisku produkcyjnym KSeF. Token nigdy nie jest wysyłany w postaci jawnej.</Text>
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
