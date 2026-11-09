import * as SecureStore from "expo-secure-store";
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
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!isCompany(parsed)) throw new Error("Zapisany profil firmy jest nieprawidłowy.");
  return parsed;
}

export async function saveCompany(company: VatCompany): Promise<void> {
  assertNative();
  await SecureStore.setItemAsync(KEY, JSON.stringify(company), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function removeCompany(): Promise<void> {
  assertNative();
  await SecureStore.deleteItemAsync(KEY);
}
