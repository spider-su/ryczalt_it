import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "ryczalt.free.ksef.token.v1";

export type KsefCredentialMetadata = { nip: string; savedAt: string };
type SavedToken = KsefCredentialMetadata & { token: string };

function nativeOnly(): void {
  if (Platform.OS === "web") {
    throw new Error("Dane uwierzytelniające KSeF można zapisać wyłącznie w aplikacji mobilnej.");
  }
}
function normalizeNip(nip: string): string {
  if (!/^\d{10}$/.test(nip)) throw new Error("Nieprawidłowy kontekst NIP.");
  return nip;
}
function parseSaved(raw: string | null): SavedToken | null {
  if (raw === null) return null;
  // Corrupted storage should fail closed, not be interpreted as disconnected.
  const candidate: unknown = JSON.parse(raw);
  if (!candidate || typeof candidate !== "object") throw new Error("Zapis KSeF jest nieprawidłowy.");
  const value = candidate as Partial<SavedToken>;
  if (typeof value.token !== "string" || !value.token.trim() ||
      typeof value.nip !== "string" || !/^\d{10}$/.test(value.nip) ||
      typeof value.savedAt !== "string" || !Number.isFinite(Date.parse(value.savedAt))) {
    throw new Error("Zapis KSeF jest nieprawidłowy.");
  }
  return { token: value.token, nip: value.nip, savedAt: value.savedAt };
}

/** Secrets are never written to AsyncStorage, logs, or telemetry. */
export async function saveKsefToken(nip: string, token: string): Promise<KsefCredentialMetadata> {
  nativeOnly();
  normalizeNip(nip);
  const cleaned = token.trim();
  if (!cleaned || cleaned.length > 4096) throw new Error("Podaj prawidłowy token KSeF.");
  const metadata = { nip, savedAt: new Date().toISOString() };
  await SecureStore.setItemAsync(KEY, JSON.stringify({ ...metadata, token: cleaned }), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return metadata;
}

export async function loadKsefCredentialMetadata(nip: string): Promise<KsefCredentialMetadata | null> {
  nativeOnly();
  normalizeNip(nip);
  const saved = parseSaved(await SecureStore.getItemAsync(KEY));
  if (!saved || saved.nip !== nip) return null;
  return { nip: saved.nip, savedAt: saved.savedAt };
}

/** For the future KSeF authentication adapter only. Never display or export this value. */
export async function getKsefTokenForAuthentication(nip: string): Promise<string | null> {
  nativeOnly();
  normalizeNip(nip);
  const saved = parseSaved(await SecureStore.getItemAsync(KEY));
  return saved?.nip === nip ? saved.token : null;
}

export async function deleteKsefToken(): Promise<void> {
  nativeOnly();
  await SecureStore.deleteItemAsync(KEY);
}
