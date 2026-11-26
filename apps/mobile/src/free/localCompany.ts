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
  const file = await FS.getInfoAsync(path);
  const raw = file.exists ? await FS.readAsStringAsync(path) : await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!isCompany(parsed)) throw new Error("Zapisany profil firmy jest nieprawidłowy.");
  return parsed;
}

export async function saveCompany(company: VatCompany): Promise<void> {
  assertNative();
  const root = FS.documentDirectory + "RyczaltIT/";
  await FS.makeDirectoryAsync(root, { intermediates: true });
  const temp = root + "company.json.tmp";
  await FS.writeAsStringAsync(temp, JSON.stringify(company));
  await FS.moveAsync({ from: temp, to: root + "company.json" });
  await SecureStore.deleteItemAsync(KEY);
}

export async function removeCompany(): Promise<void> {
  assertNative();
  await SecureStore.deleteItemAsync(KEY);
  await FS.deleteAsync(FS.documentDirectory + "RyczaltIT/company.json", { idempotent: true });
}
