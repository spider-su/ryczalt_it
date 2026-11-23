import { describe, expect, it } from "vitest";
import { assessTaxReadiness, mergeKsefInvoices, type KsefInvoice } from "./invoiceLedger";
const invoice: KsefInvoice = {
  source: "ksef", ksefId: "ksef-1", taxpayerNip: "8133703437",
  direction: "issued", kind: "standard", issueDate: "2026-11-20",
  currency: "PLN", grossMinor: "12300", netMinor: "10000", vatMinor: "2300",
  classification: "unclassified",
};
const ledger = { taxpayerNip: invoice.taxpayerNip, invoices: [] as KsefInvoice[] };
describe("KSeF-only ledger", () => {
  it("deduplicates repeated sync and preserves accounting classification", () => {
    const first = mergeKsefInvoices(ledger, [{ ...invoice, classification: "taxable" }]);
    const next = mergeKsefInvoices(first, [invoice, invoice]);
    expect(next.invoices).toHaveLength(1);
    expect(next.invoices[0]?.classification).toBe("taxable");
  });
  it("rejects cross-company and non-KSeF invoice records atomically", () => {
    expect(() => mergeKsefInvoices(ledger, [{ ...invoice, taxpayerNip: "0000000000" }])).toThrow();
    expect(() => mergeKsefInvoices(ledger, [{ ...invoice, source: "manual" as "ksef" }])).toThrow();
    expect(ledger.invoices).toHaveLength(0);
  });
  it("does not assume absent opening balances or ZUS equal zero", () => {
    const state = assessTaxReadiness({ ...ledger, invoices: [invoice] }, "2026-11", {});
    expect(state.ready).toBe(false);
    expect(state.missing).toContain("Saldo początkowe VAT");
    expect(state.missing).toContain("Niesklasyfikowane faktury");
  });
});
