/**
 * Local-only accounting input contract. KSeF is the sole invoice provenance.
 * No manually created/imported invoices are accepted.
 */
export type InvoiceDirection = "issued" | "received";
export type InvoiceKind = "standard" | "correction" | "advance" | "final" | "other";
export type AccountingClassification = "unclassified" | "taxable" | "exempt" | "outside_scope";
export interface KsefInvoice {
  ksefId: string;
  taxpayerNip: string;
  direction: InvoiceDirection;
  kind: InvoiceKind;
  issueDate: string;
  currency: string;
  grossMinor: string;
  netMinor: string;
  vatMinor: string;
  correctionOf?: string;
  classification: AccountingClassification;
  source: "ksef";
}
export interface InvoiceLedger {
  taxpayerNip: string;
  invoices: KsefInvoice[];
  lastSuccessfulSync?: string;
}
const MONEY = /^-?\d+$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
function validCalendarDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (daysInMonth[month - 1] ?? 0);
}
function validInvoice(invoice: KsefInvoice, nip: string): boolean {
  return invoice.source === "ksef" && invoice.taxpayerNip === nip &&
    /^\d{10}$/.test(nip) && Boolean(invoice.ksefId.trim()) &&
    validCalendarDate(invoice.issueDate) && /^[A-Z]{3}$/.test(invoice.currency) &&
    MONEY.test(invoice.netMinor) && MONEY.test(invoice.vatMinor) && MONEY.test(invoice.grossMinor) &&
    ["issued", "received"].includes(invoice.direction) &&
    ["standard", "correction", "advance", "final", "other"].includes(invoice.kind) &&
    ["unclassified", "taxable", "exempt", "outside_scope"].includes(invoice.classification);
}
/** An atomic merge of a validated KSeF page, deduplicated by official ID. */
export function mergeKsefInvoices(ledger: InvoiceLedger, incoming: readonly KsefInvoice[]): InvoiceLedger {
  if (!/^\d{10}$/.test(ledger.taxpayerNip)) throw new Error("Invalid taxpayer context");
  if (incoming.some((invoice) => !validInvoice(invoice, ledger.taxpayerNip))) {
    throw new Error("Invalid KSeF invoice or taxpayer mismatch");
  }
  const merged = new Map<string, KsefInvoice>();
  for (const invoice of ledger.invoices) {
    if (!validInvoice(invoice, ledger.taxpayerNip)) throw new Error("Invalid stored invoice");
    merged.set(invoice.ksefId, invoice);
  }
  for (const invoice of incoming) {
    // KSeF invoices are immutable: once imported, never overwrite their content.
    // A correction is a separate document with its own KSeF identifier.
    if (!merged.has(invoice.ksefId)) merged.set(invoice.ksefId, invoice);
  }
  return { ...ledger, invoices: [...merged.values()].sort((a, b) =>
    a.issueDate.localeCompare(b.issueDate) || a.ksefId.localeCompare(b.ksefId)) };
}
export type TaxReadiness = { ready: boolean; missing: string[] };
/** Never represent absent historical tax facts as zero. */
export function assessTaxReadiness(
  ledger: InvoiceLedger,
  month: string,
  facts: { openingVatMinor?: string; paidZusSocialMinor?: string; paidZusHealthMinor?: string; priorYearRevenueMinor?: string },
): TaxReadiness {
  const missing: string[] = [];
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) missing.push("Nieprawidłowy miesiąc");
  if (!ledger.lastSuccessfulSync) missing.push("Brak synchronizacji KSeF");
  if (ledger.invoices.some((i) => i.issueDate.startsWith(month) && i.classification === "unclassified"))
    missing.push("Niesklasyfikowane faktury");
  for (const [field, label] of [
    ["openingVatMinor", "Saldo początkowe VAT"],
    ["paidZusSocialMinor", "Zapłacone składki społeczne"],
    ["paidZusHealthMinor", "Zapłacona składka zdrowotna"],
    ["priorYearRevenueMinor", "Przychód poprzedniego roku"],
  ] as const) if (facts[field] === undefined || !MONEY.test(facts[field]))
    missing.push(label);
  if (ledger.invoices.some((i) => i.issueDate.startsWith(month) && i.currency !== "PLN"))
    missing.push("Zweryfikowany kurs walutowy");
  return { ready: missing.length === 0, missing };
}
