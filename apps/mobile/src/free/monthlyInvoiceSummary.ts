import type { InvoiceLedger, KsefInvoice } from "./invoiceLedger";

export type MonthlyInvoiceSummary = {
  month: string;
  issuedCount: number;
  receivedCount: number;
  unclassifiedCount: number;
  foreignCurrencyCount: number;
  issuedNetPlnMinor: string | null;
  issuedVatPlnMinor: string | null;
  receivedNetPlnMinor: string | null;
  receivedVatPlnMinor: string | null;
};

/**
 * Invoice totals are not tax liabilities. Amounts remain unavailable when
 * foreign-currency invoices are present; FX must be independently verified.
 * Corrections are included as signed KSeF amounts, not applied twice.
 */
export function summarizeKsefMonth(ledger: InvoiceLedger, month: string): MonthlyInvoiceSummary {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
  const invoices = ledger.invoices.filter((invoice) => invoice.issueDate.startsWith(month));
  const issued = invoices.filter((invoice) => invoice.direction === "issued");
  const received = invoices.filter((invoice) => invoice.direction === "received");
  const sum = (items: KsefInvoice[], field: "netMinor" | "vatMinor"): string | null =>
    items.some((invoice) => invoice.currency !== "PLN") ? null :
      items.reduce((total, invoice) => total + BigInt(invoice[field]), 0n).toString();
  return {
    month,
    issuedCount: issued.length,
    receivedCount: received.length,
    unclassifiedCount: invoices.filter((invoice) => invoice.classification === "unclassified").length,
    foreignCurrencyCount: invoices.filter((invoice) => invoice.currency !== "PLN").length,
    issuedNetPlnMinor: sum(issued, "netMinor"),
    issuedVatPlnMinor: sum(issued, "vatMinor"),
    receivedNetPlnMinor: sum(received, "netMinor"),
    receivedVatPlnMinor: sum(received, "vatMinor"),
  };
}
