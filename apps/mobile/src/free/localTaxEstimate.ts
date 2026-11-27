import type { InvoiceLedger } from "./invoiceLedger";
import { assessTaxReadiness } from "./invoiceLedger";
import type { TaxSettings } from "./taxSettings";
import { settingsForMonth } from "./taxSettings";
import type { MonthlyTaxFacts } from "./monthlyTaxFacts";
import { calculateVat } from "./tax/vat";

export type LocalTaxEstimate = {
  missing: string[];
  vatPayablePln?: string;
  vatCarryForwardPln?: string;
  outputVatMinor?: string;
};
/** Estimates are deliberately blocked if source data is not sufficiently classified.
 * KSeF does not prove payment, income recognition, VAT deductibility or ZUS payments. */
export function estimateLocalTaxes(ledger: InvoiceLedger, history: readonly TaxSettings[], month: string, facts: MonthlyTaxFacts | null = null): LocalTaxEstimate {
  const settings = settingsForMonth(history, month);
  const missing = [...assessTaxReadiness(ledger, month, {
    ...(facts ?? {}),
    ...(settings ? { priorYearRevenueMinor: settings.priorYearRevenueMinor } : {}),
  }).missing];
  if (!settings) missing.push("Brak konfiguracji podatkowej obowiązującej w tym miesiącu");
  if (!facts) missing.push("Brak potwierdzonych danych księgowych dla wybranego miesiąca");
  const invoices = ledger.invoices.filter(i => i.issueDate.startsWith(month));
  if (invoices.some(i => i.kind === "advance" || i.kind === "final" || i.kind === "other"))
    missing.push("Faktury zaliczkowe, końcowe lub niestandardowe wymagają rozliczenia");
  if (invoices.some(i => i.direction === "received" && i.classification === "taxable"))
    missing.push("Brak potwierdzonej kwoty VAT podlegającej odliczeniu z faktur zakupowych");
  if (invoices.some(i => i.kind === "correction"))
    missing.push("Korekty wymagają potwierdzenia okresu rozliczenia");
  if (missing.length || !facts) return { missing: [...new Set(missing)] };
  const output = invoices.filter(i => i.direction === "issued" && i.classification === "taxable")
    .reduce((sum, i) => sum + BigInt(i.vatMinor), 0n);
  const result = calculateVat({
    outputBeforeCorrections: output, salesCorrections: 0n,
    deductibleInput: 0n, adjustments: 0n, carryForward: BigInt(facts.openingVatMinor),
  });
  return { missing: [], vatPayablePln: result.payable.toString(),
    vatCarryForwardPln: result.carryForward.toString(), outputVatMinor: result.output.toString() };
}
