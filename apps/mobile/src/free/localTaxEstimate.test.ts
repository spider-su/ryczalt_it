import { describe, expect, it, vi } from "vitest";
vi.mock("expo-file-system/legacy", () => ({ documentDirectory: "file:///test/" }));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
import { estimateLocalTaxes } from "./localTaxEstimate";
import type { InvoiceLedger } from "./invoiceLedger";
import type { TaxSettings } from "./taxSettings";
const nip = "8133703437";
const ledger: InvoiceLedger = { taxpayerNip: nip, invoices: [], synchronizedMonths: { "2026-11": "2026-11-26T12:00:00Z", "2026-12": "2026-12-01T12:00:00Z" } };
const settings: TaxSettings = { effectiveFrom: "2026-11", ryczaltRate: "12", vatPayer: true, settlement: "monthly",
 priorYearRevenueMinor: "10000000", openingVatMinor: "1500", paidZusSocialMinor: "10000", paidZusHealthMinor: "5000" };
describe("offline tax estimates", () => {
 it("calculates a zero-invoice month only with explicitly confirmed monthly facts", () => {
  expect(estimateLocalTaxes(ledger, [settings], "2026-11")).toMatchObject({ missing: [], vatPayablePln: "0", vatCarryForwardPln: "15" });
 });
 it("does not reuse opening VAT or paid ZUS in later months", () => {
  const result = estimateLocalTaxes(ledger, [settings], "2026-12");
  expect(result.vatPayablePln).toBeUndefined();
  expect(result.missing).toContain("Brak potwierdzonych danych księgowych dla wybranego miesiąca");
 });
 it("blocks estimates when the KSeF month is not confirmed synchronized", () => {
  expect(estimateLocalTaxes({ ...ledger, synchronizedMonths: {} }, [settings], "2026-11").vatPayablePln).toBeUndefined();
 });
});
