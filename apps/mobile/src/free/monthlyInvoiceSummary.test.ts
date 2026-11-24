import { describe, expect, it } from "vitest";
import { summarizeKsefMonth } from "./monthlyInvoiceSummary";
import type { KsefInvoice } from "./invoiceLedger";
const base: KsefInvoice = {
  source: "ksef", taxpayerNip: "8133703437", ksefId: "1", direction: "issued",
  kind: "standard", issueDate: "2026-11-10", currency: "PLN",
  netMinor: "10000", vatMinor: "2300", grossMinor: "12300", classification: "taxable",
};
describe("KSeF monthly invoice facts", () => {
  it("sums corrections as signed values with integer arithmetic", () => {
    const result = summarizeKsefMonth({ taxpayerNip: base.taxpayerNip, invoices: [
      base, { ...base, ksefId: "2", kind: "correction", netMinor: "-2000", vatMinor: "-460", grossMinor: "-2460" },
    ] }, "2026-11");
    expect(result.issuedNetPlnMinor).toBe("8000");
    expect(result.issuedVatPlnMinor).toBe("1840");
    expect(result.issuedCount).toBe(2);
  });
  it("does not invent PLN totals for foreign currency", () => {
    const result = summarizeKsefMonth({ taxpayerNip: base.taxpayerNip, invoices: [
      { ...base, currency: "EUR" },
    ] }, "2026-11");
    expect(result.issuedNetPlnMinor).toBeNull();
    expect(result.foreignCurrencyCount).toBe(1);
  });
  it("does not mix months or received invoices into sales", () => {
    const result = summarizeKsefMonth({ taxpayerNip: base.taxpayerNip, invoices: [
      base, { ...base, ksefId: "2", direction: "received" },
      { ...base, ksefId: "3", issueDate: "2026-10-01" },
    ] }, "2026-11");
    expect(result.issuedCount).toBe(1);
    expect(result.receivedCount).toBe(1);
  });
});
