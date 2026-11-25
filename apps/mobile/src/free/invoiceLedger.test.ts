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
  it("rejects conflicting source documents while keeping classification", () => {
    const first = mergeKsefInvoices(ledger, [{ ...invoice, classification: "taxable" }]);
    expect(() => mergeKsefInvoices(first, [{ ...invoice, grossMinor: "1" }])).toThrow("Conflicting");
    expect(first.invoices[0]?.grossMinor).toBe("12300");
    expect(mergeKsefInvoices(first, [invoice]).invoices[0]?.classification).toBe("taxable");
  });
  it("requires synchronization coverage for the requested month", () => {
    const facts = { openingVatMinor: "0", paidZusSocialMinor: "0", paidZusHealthMinor: "0", priorYearRevenueMinor: "0" };
    const state = { ...ledger, lastSuccessfulSync: "2026-11-25T00:00:00Z", synchronizedMonths: { "2026-10": "2026-11-25T00:00:00Z" } };
    expect(assessTaxReadiness(state, "2026-11", facts).ready).toBe(false);
    expect(assessTaxReadiness(state, "2026-10", facts).ready).toBe(true);
  });
  it("rejects cross-company and non-KSeF invoice records atomically", () => {
    expect(() => mergeKsefInvoices(ledger, [{ ...invoice, taxpayerNip: "0000000000" }])).toThrow();
    expect(() => mergeKsefInvoices(ledger, [{ ...invoice, source: "manual" as "ksef" }])).toThrow();
    expect(ledger.invoices).toHaveLength(0);
  });
  it("rejects impossible invoice dates and accepts leap days", () => {
    for (const issueDate of ["2026-02-29", "2026-04-31", "2026-00-10", "2026-13-01", "0000-01-01"]) {
      expect(() => mergeKsefInvoices(ledger, [{ ...invoice, issueDate }])).toThrow();
    }
    expect(mergeKsefInvoices(ledger, [{ ...invoice, issueDate: "2024-02-29" }]).invoices).toHaveLength(1);
  });
  it("does not assume absent opening balances or ZUS equal zero", () => {
    const state = assessTaxReadiness({ ...ledger, invoices: [invoice] }, "2026-11", {});
    expect(state.ready).toBe(false);
    expect(state.missing).toContain("Saldo początkowe VAT");
    expect(state.missing).toContain("Niesklasyfikowane faktury");
  });
});
