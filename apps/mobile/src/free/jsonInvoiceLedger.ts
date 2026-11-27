import * as FS from "expo-file-system/legacy";
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { mergeKsefInvoices, type InvoiceLedger, type KsefInvoice } from "./invoiceLedger";
import { readSecureLedger, deleteSecureLedger } from "./secureInvoiceLedger";

type StorageCipher = { encryptInvoiceRecord(plaintext: string, context: string): Promise<string>; decryptInvoiceRecord(payload: string, context: string): Promise<string> };
function cipher(): StorageCipher {
  const module = requireOptionalNativeModule<StorageCipher>("RyczaltKsefCrypto");
  if (Platform.OS !== "android" || !module) throw new Error("Encrypted invoice storage unavailable");
  return module;
}
/** Records are encrypted and authenticated using a key held in Android Keystore. */
function root(nip: string): string {
  if (Platform.OS === "web" || !FS.documentDirectory) throw new Error("Android file storage unavailable");
  if (!/^\d{10}$/.test(nip)) throw new Error("Invalid taxpayer NIP");
  return FS.documentDirectory + "RyczaltIT/" + nip + "/";
}
function monthDir(nip: string, month: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
  return root(nip) + month.slice(0, 4) + "/" + month.slice(5) + "/";
}
async function ensure(path: string): Promise<void> {
  await FS.makeDirectoryAsync(path, { intermediates: true });
}
async function atomicJson(path: string, value: unknown): Promise<void> {
  const temp = path + ".tmp";
  await FS.writeAsStringAsync(temp, await cipher().encryptInvoiceRecord(JSON.stringify(value), path.slice(FS.documentDirectory!.length)));
  try { await FS.moveAsync({ from: temp, to: path }); }
  catch (error) { await FS.deleteAsync(temp, { idempotent: true }); throw error; }
}
async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await cipher().decryptInvoiceRecord(await FS.readAsStringAsync(path), path.slice(FS.documentDirectory!.length))) as unknown;
}
function invoiceName(id: string): string {
  if (!/^[A-Za-z0-9-]{1,160}$/.test(id)) throw new Error("Unsafe KSeF identifier");
  return id + ".json";
}
async function existing(path: string): Promise<boolean> {
  return (await FS.getInfoAsync(path)).exists;
}
async function loadFiles(nip: string): Promise<InvoiceLedger> {
  const ledger: InvoiceLedger = { taxpayerNip: nip, invoices: [] };
  const base = root(nip);
  if (!(await existing(base))) return ledger;
  for (const year of await FS.readDirectoryAsync(base)) {
    if (!/^\d{4}$/.test(year)) continue;
    const yearPath = base + year + "/";
    for (const m of await FS.readDirectoryAsync(yearPath)) {
      if (!/^(0[1-9]|1[0-2])$/.test(m)) continue;
      const folder = yearPath + m + "/";
      const invoiceFolder = folder + "invoices/";
      if (await existing(invoiceFolder)) {
        for (const file of await FS.readDirectoryAsync(invoiceFolder)) {
          if (!file.endsWith(".json")) continue;
          const invoice = await readJson(invoiceFolder + file) as KsefInvoice;
          ledger.invoices.push(invoice);
        }
      }
      const marker = folder + "sync.json";
      if (await existing(marker)) {
        const value = await readJson(marker) as { completedAt?: unknown };
        if (typeof value.completedAt !== "string" || !Number.isFinite(Date.parse(value.completedAt)))
          throw new Error("Corrupt sync marker");
        (ledger.synchronizedMonths ??= {})[year + "-" + m] = value.completedAt;
      }
    }
  }
  const validated = mergeKsefInvoices({ taxpayerNip: nip, invoices: [] }, ledger.invoices);
  validated.synchronizedMonths = ledger.synchronizedMonths;
  const timestamps = Object.values(ledger.synchronizedMonths ?? {}).sort();
  if (timestamps.length) validated.lastSuccessfulSync = timestamps[timestamps.length - 1];
  return validated;
}
/** Migration is idempotent; old secure ledger is deleted only after all invoices and markers persist. */
export async function readInvoiceLedger(nip: string): Promise<InvoiceLedger> {
  const base = root(nip);
  await ensure(base);
  const old = await readSecureLedger(nip);
  if (old.invoices.length || Object.keys(old.synchronizedMonths ?? {}).length) {
    await persistInvoiceLedger(old);
    const saved = await loadFiles(nip);
    const checked = mergeKsefInvoices(saved, old.invoices);
    if (checked.invoices.length !== saved.invoices.length || Object.entries(old.synchronizedMonths ?? {}).some(([month, stamp]) => saved.synchronizedMonths?.[month] !== stamp))
      throw new Error("Invoice migration verification failed");
    await deleteSecureLedger(nip);
  }
  return loadFiles(nip);
}
/** Append-only invoice files; correction invoices are independent records. */
export async function persistInvoiceLedger(ledger: InvoiceLedger): Promise<void> {
  const nip = ledger.taxpayerNip;
  const verified = mergeKsefInvoices({ taxpayerNip: nip, invoices: [] }, ledger.invoices);
  for (const invoice of verified.invoices) {
    const folder = monthDir(nip, invoice.issueDate.slice(0, 7)) + "invoices/";
    await ensure(folder);
    const path = folder + invoiceName(invoice.ksefId);
    if (await existing(path)) {
      mergeKsefInvoices({ taxpayerNip: nip, invoices: [await readJson(path) as KsefInvoice] }, [invoice]);
    } else await atomicJson(path, invoice);
  }
  for (const [month, completedAt] of Object.entries(ledger.synchronizedMonths ?? {})) {
    if (!Number.isFinite(Date.parse(completedAt))) throw new Error("Invalid completion timestamp");
    const folder = monthDir(nip, month);
    await ensure(folder);
    const marker = folder + "sync.json";
    if (await existing(marker)) {
      const previous = await readJson(marker) as { completedAt?: string };
      if (previous.completedAt === completedAt) continue;
    }
    await atomicJson(marker, { completedAt });
  }
}
export async function deleteInvoiceLedger(nip: string): Promise<void> {
  const base = root(nip);
  await FS.deleteAsync(base, { idempotent: true });
  await deleteSecureLedger(nip);
}
