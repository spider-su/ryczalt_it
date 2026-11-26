import * as SecureStore from "expo-secure-store";
import * as FS from "expo-file-system/legacy";
import { Platform } from "react-native";
import type { VatCompany } from "./nip";

const KEY = "ryczalt.free.company.v1";

/** The free app is Android-first. Never silently downgrade to unencrypted web storage. */
function assertNative(): void {
  if (Platform.OS === "web") throw new Error("Zapis lokalny jest dostępny tylko w aplikacji mobilnej.");
}

function isCompany(value: unknown): value is VatCompany {
  if (!value || typeof value !== "object") return false;
  const company = value as Partial<VatCompany>;
  return typeof company.nip === "string" && typeof company.name === "string" &&
    typeof company.retrievedAt === "string";
}

export async function loadCompany(): Promise<VatCompany | null> {
  assertNative();
  const path = FS.documentDirectory + "RyczaltIT/company.json";
  let raw = await SecureStore.getItemAsync(KEY);
  // Preserve data from an installed draft: migrate before deleting its plaintext copy.
  if (!raw && (await FS.getInfoAsync(path)).exists) {
    raw = await FS.readAsStringAsync(path);
    const parsed: unknown = JSON.parse(raw);
    if (!isCompany(parsed)) throw new Error("Zapisany profil firmy jest nieprawidłowy.");
    await SecureStore.setItemAsync(KEY, raw, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    if ((await SecureStore.getItemAsync(KEY)) !== raw) throw new Error("Nie można zweryfikować zapisu firmy.");
  }
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!isCompany(parsed)) throw new Error("Zapisany profil firmy jest nieprawidłowy.");
  if ((await FS.getInfoAsync(path)).exists) {
    const draft: unknown = JSON.parse(await FS.readAsStringAsync(path));
    if (!isCompany(draft) || JSON.stringify(draft) !== JSON.stringify(parsed)) throw new Error("Niezgodne zapisane profile firmy; dane pozostawiono na urządzeniu.");
    await FS.deleteAsync(path, { idempotent: true });
  }
  return parsed;
}

export async function saveCompany(company: VatCompany): Promise<void> {
  assertNative();
  await SecureStore.setItemAsync(KEY, JSON.stringify(company), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  await FS.deleteAsync(FS.documentDirectory + "RyczaltIT/company.json", { idempotent: true });
}

export async function removeCompany(): Promise<void> {
  assertNative();
  await SecureStore.deleteItemAsync(KEY);
  await FS.deleteAsync(FS.documentDirectory + "RyczaltIT/company.json", { idempotent: true });
}
