import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { mergeKsefInvoices, type InvoiceLedger, type KsefInvoice } from "./invoiceLedger";

/**
 * Encrypted, device-only checkpoint for small KSeF ledgers.
 * SecureStore has platform-dependent payload limits: never silently truncate,
 * and never mark a sync complete until every page has been committed.
 * A scalable encrypted database must replace this before large-account release.
 */
const KEY_PREFIX = "ryczalt.free.ksef.ledger.v1.";
const MAX_BYTES = 1600;
export interface SecureLedgerStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: { keychainAccessible: number }): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}
const defaultStore: SecureLedgerStore = SecureStore;
function key(nip: string): string {
  if (!/^\d{10}$/.test(nip)) throw new Error("Invalid NIP");
  return KEY_PREFIX + nip;
}
function empty(nip: string): InvoiceLedger {
  return { taxpayerNip: nip, invoices: [] };
}
export async function readSecureLedger(nip: string, store: SecureLedgerStore = defaultStore): Promise<InvoiceLedger> {
  if (Platform.OS === "web" && store === defaultStore) throw new Error("Mobile only");
  const raw = await store.getItemAsync(key(nip));
  if (raw === null) return empty(nip);
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("Corrupt KSeF ledger");
  const candidate = value as Partial<InvoiceLedger>;
  if (candidate.taxpayerNip !== nip || !Array.isArray(candidate.invoices)) throw new Error("Ledger NIP mismatch");
  const validated = mergeKsefInvoices(empty(nip), candidate.invoices as KsefInvoice[]);
  if (candidate.lastSuccessfulSync !== undefined) {
    if (typeof candidate.lastSuccessfulSync !== "string" || !Number.isFinite(Date.parse(candidate.lastSuccessfulSync)))
      throw new Error("Invalid sync timestamp");
    validated.lastSuccessfulSync = candidate.lastSuccessfulSync;
  }
  if (candidate.synchronizedMonths !== undefined) {
    if (!candidate.synchronizedMonths || typeof candidate.synchronizedMonths !== "object" || Array.isArray(candidate.synchronizedMonths) || Object.entries(candidate.synchronizedMonths).some(([month, timestamp]) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || typeof timestamp !== "string" || !Number.isFinite(Date.parse(timestamp)))) throw new Error("Invalid sync coverage");
    validated.synchronizedMonths = candidate.synchronizedMonths;
  }
  return validated;
}
export async function writeSecureLedger(ledger: InvoiceLedger, store: SecureLedgerStore = defaultStore): Promise<void> {
  if (Platform.OS === "web" && store === defaultStore) throw new Error("Mobile only");
  const verified = mergeKsefInvoices(empty(ledger.taxpayerNip), ledger.invoices);
  if (ledger.lastSuccessfulSync !== undefined) {
    if (!Number.isFinite(Date.parse(ledger.lastSuccessfulSync))) throw new Error("Invalid sync timestamp");
    verified.lastSuccessfulSync = ledger.lastSuccessfulSync;
  }
  if (ledger.synchronizedMonths !== undefined) {
    if (Object.entries(ledger.synchronizedMonths).some(([month, timestamp]) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || typeof timestamp !== "string" || !Number.isFinite(Date.parse(timestamp)))) throw new Error("Invalid sync coverage");
    verified.synchronizedMonths = ledger.synchronizedMonths;
  }
  const payload = JSON.stringify(verified);
  // All records are ASCII-safe except user-controlled fields. Conservative
  // UTF-8 bound without relying on Node Buffer in React Native.
  const bytes = encodeURIComponent(payload).replace(/%[0-9A-F]{2}|[^%]/g, (part) => part.startsWith('%') ? 'x' : part).length;
  if (bytes > MAX_BYTES) throw new Error("Ledger exceeds secure storage capacity; no data saved");
  await store.setItemAsync(key(ledger.taxpayerNip), payload, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
export async function deleteSecureLedger(nip: string, store: SecureLedgerStore = defaultStore): Promise<void> {
  await store.deleteItemAsync(key(nip));
}
