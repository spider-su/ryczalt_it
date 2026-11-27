import { KsefAuthClient } from "./ksefAuth";
import { KsefAndroidEncryptor } from "./ksefNativeEncryption";
import { getKsefTokenForAuthentication } from "./ksefCredentials";
import { KsefInvoiceReader } from "./ksefInvoiceReader";
import { parseMinimalFa3 } from "./parseMinimalFa3";
import { readInvoiceLedger, persistInvoiceLedger } from "./jsonInvoiceLedger";
import { mergeKsefInvoices, type InvoiceLedger, type InvoiceDirection } from "./invoiceLedger";
import { loadCompany } from "./localCompany";

const activeCompanies = new Set<string>();

/** Explicitly bounded checkpoint-based sync. Never mark a partial import successful. */
export async function synchronizeKsefMonth(nip: string, month: string): Promise<InvoiceLedger> {
  if (!/^\d{10}$/.test(nip) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new Error("Invalid taxpayer or month");
  if (activeCompanies.has(nip)) throw new Error("Synchronization already in progress");
  activeCompanies.add(nip);
  try {
  const credential = await getKsefTokenForAuthentication(nip);
  if (!credential) throw new Error("KSeF token is not configured");
  const auth = await new KsefAuthClient("production", new KsefAndroidEncryptor()).authenticate(nip, credential);
  const reader = new KsefInvoiceReader();
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  const from = month + "-01T00:00:00+00:00";
  const to = nextMonth + "T00:00:00+00:00";
  let ledger = await readInvoiceLedger(nip);
  const failures: string[] = [];
  for (const [subject, direction] of [["Subject1", "issued"], ["Subject2", "received"]] as const) {
    let page = 0;
    while (true) {
      if (page >= 100) throw new Error("Too many invoice pages; sync not complete");
      const result = await reader.list(auth.accessToken, subject, from, to, page, 100);
      const newInvoices: InvoiceLedger["invoices"] = [];
      for (const ref of result.invoices) {
        if (ledger.invoices.some((item) => item.ksefId === ref.ksefNumber && item.direction === direction)) continue;
        try {
          const xml = await reader.downloadXml(auth.accessToken, ref.ksefNumber);
          newInvoices.push(parseMinimalFa3(xml, ref.ksefNumber, nip, direction as InvoiceDirection));
        } catch (reason) {
          failures.push(`${ref.ksefNumber}: ${reason instanceof Error ? reason.message : String(reason)}`);
        }
      }
      ledger = mergeKsefInvoices(ledger, newInvoices);
      if (newInvoices.length) await persistInvoiceLedger(ledger);
      if (!result.hasMore) break;
      page += 1;
    }
  }
  if (failures.length) throw new Error(`Nie pobrano ${failures.length} faktur. ${failures.slice(0, 3).join(" | ")}`);
  const completedAt = new Date().toISOString();
  ledger = { ...ledger, lastSuccessfulSync: completedAt, synchronizedMonths: { ...ledger.synchronizedMonths, [month]: completedAt } };
  if ((await loadCompany())?.nip !== nip) throw new Error("Active company changed during synchronization");
  await persistInvoiceLedger(ledger);
  return ledger;
  } finally { activeCompanies.delete(nip); }
}
