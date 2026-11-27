import { describe,expect,it,vi } from "vitest";
vi.mock("expo-file-system/legacy",()=>({documentDirectory:"file:///test/"}));
vi.mock("react-native",()=>({Platform:{OS:"android"}}));
import { estimateCompleteTaxes } from "./completeTaxEstimate";
import type { InvoiceLedger,KsefInvoice } from "./invoiceLedger";
import type { TaxSettings } from "./taxSettings";
import type { InvoiceReview } from "./monthlyInvoiceReview";
const nip="8133703437";
const cfg:TaxSettings={effectiveFrom:"2026-01",ryczaltRate:"12",vatPayer:true,settlement:"monthly",
 priorYearRevenueMinor:"0",openingVatMinor:"0",paidZusSocialMinor:"0",paidZusHealthMinor:"0",
 jdgActive:true,qualifyingUop:false,voluntarySickness:false};
const invoice=(month:string):KsefInvoice=>({ksefId:"ID-"+month,taxpayerNip:nip,
 direction:"issued",kind:"standard",issueDate:month+"-01",currency:"PLN",
 grossMinor:"1230000",netMinor:"1000000",vatMinor:"230000",classification:"taxable",source:"ksef"});
const ledger:InvoiceLedger={taxpayerNip:nip,invoices:[invoice("2026-01"),invoice("2026-02")],
 synchronizedMonths:{"2026-01":"2026-02-01T10:00:00Z","2026-02":"2026-03-01T10:00:00Z"}};
const feb={month:"2026-02",openingVatMinor:"0",paidZusSocialMinor:"0",paidZusHealthMinor:"0"};
const reviews:Record<string,InvoiceReview>={
 "ID-2026-01":{ksefId:"ID-2026-01",direction:"issued",accountingMonth:"2026-01"},
 "ID-2026-02":{ksefId:"ID-2026-02",direction:"issued",accountingMonth:"2026-02"},
};
describe("sequential offline PIT VAT ZUS integration",()=>{
 it("starts at Jan 2026 and applies paid-history assumption without outstanding historic liabilities",()=>{
  const result=estimateCompleteTaxes(ledger,[cfg],"2026-02",{"2026-02":feb},reviews);
  expect(result.missing).toEqual([]);
  expect(result.pitPayablePln).toBe("1200");
  expect(result.vatPayablePln).toBe("2300");
  expect(result.zusPayableMinor).toBe("228664");
  expect(result.historicalPeriodsAssumedPaid).toBe(true);
 });
 it("blocks missing KSeF history instead of inventing zero invoices",()=>{
  const result=estimateCompleteTaxes({...ledger,synchronizedMonths:{"2026-02":"2026-03-01T10:00:00Z"}},[cfg],"2026-02",{"2026-02":feb},reviews);
  expect(result.pitPayablePln).toBeUndefined();
  expect(result.missing[0]).toContain("2026-01");
 });
 it("blocks invoices that have not been approved for accounting",()=>{
  const result=estimateCompleteTaxes(ledger,[cfg],"2026-02",{"2026-02":feb},{"ID-2026-02":reviews["ID-2026-02"]!});
  expect(result.vatPayablePln).toBeUndefined();
  expect(result.missing[0]).toContain("Zatwierdź");
 });
 it("requires explicit paid facts for selected month",()=>{
  const result=estimateCompleteTaxes(ledger,[cfg],"2026-02",{},reviews);
  expect(result.missing[0]).toContain("zapłacone składki");
 });
});
