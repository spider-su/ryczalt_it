/** Canonical accounting REST decimals are exact strings. */
export type Decimal = string;

export type AccountingPeriodDto = {
  month: string;
  status: string;
  calculations: CalculationDto[];
  summary: { revenue: Decimal; ryczalt: Decimal; vat: Decimal; zus: Decimal };
  documents: { invoiceCount: number; transactionCount: number };
  settlement: SettlementDto;
  reconciliation: ReconciliationDto;
  completeness: { status: string; blockingIssueCount: number };
  allowedActions: string[];
};
export type CalculationDto = { type: string; status: string; amount: Decimal };
export type SettlementDto = { expectedCount: number; paidCount: number; outstandingCount: number; totalExpected: Decimal; totalPaid: Decimal; totalOutstanding: Decimal; fullySettled: boolean };
export type ReconciliationDto = { rowCount: number; settledCount: number; mismatchCount: number; missingEvidenceCount: number };
export type InvoiceDto = { id: number | string; direction: string; reference: string | null; issueDate: string | null; accountingDate: string | null; netAmount: Decimal | null; vatAmount: Decimal | null; grossAmount: Decimal | null; currency: string | null; bookedNetPln: Decimal | null; ryczaltRate: Decimal | null; deductibleVat: Decimal | null; classification: string | null; counterparty: { id: number | string; legalName: string; alias: string | null } | null; approvalStatus: string | null; approvalMethod: string | null; paymentVerificationPolicy: string | null; paymentStatus: string | null; sourceType: string | null; sourceReference: string | null };
export type TransactionDto = { id: number | string; bookingDate: string | null; amount: Decimal | null; currency: string | null; reference: string | null; counterparty: string | null; description: string | null; matchedAmount: Decimal | null };
export type ObligationDto = { id: number | string; type: string; expectedAmount: Decimal | null; paidAmount: Decimal | null; outstandingAmount: Decimal | null; currency: string | null; dueDate: string | null; status: string };
export type PaymentDto = { type: string; period: string; expectedAmount: Decimal | null; paidAmount: Decimal | null; outstandingAmount: Decimal | null; dueDate: string | null; paymentDate: string | null; status: string };
export type AccountingIssueDto = { id: string; code: string; severity: string; kind: string; title: string | null; message: string | null; sourceReference: string | null };
export type CounterpartyDto = { id: number | string; legalName: string; alias: string | null; displayName?: string | null; taxIdentifier: string | null; country: string | null; ruleCount?: number; invoiceCount?: number };
export type CounterpartyRuleDto = { id: number | string; name: string; sourceType: string | null; documentType: string | null; serviceKey: string | null; classification: string | null; vatTreatment: string | null; vatDeductionRatio: Decimal | null; ryczaltRate: Decimal | null; autoApprove: boolean; paymentVerificationPolicy: string };
export type InvoiceCandidateDto = {
  candidateKey: string; sourceType: string; sourceExternalId: string; documentType: string; direction: string; issueDate: string | null; saleDate: string | null; dueDate: string | null; reference: string | null; counterpartyId: number | string | null; currency: string | null;
  netAmount: Decimal | null; vatAmount: Decimal | null; grossAmount: Decimal | null; classification: string | null; vatTreatment: string | null; ryczaltRate: Decimal | null; approvalStatus: string | null; approvalMethod: string | null; paymentVerificationPolicy: string | null; paymentStatus: string | null; duplicate: boolean; periodYear: number; periodMonth: number; requiredInputs: RequiredInputDto[];
};
export type RequiredInputDto = { field: string; inputType: string; required: boolean; options: { value: string; labelKey: string }[]; dependsOn: string | null; dependsOnValues: string[] };
export type InvoiceCreateDto = { candidateKey: string; counterpartyId?: number | string | null; classification?: string | null; vatTreatment?: string | null; vatDeductionRatio?: Decimal | null; ryczaltRate?: Decimal | null; paymentVerificationPolicy?: string | null; approve: boolean; rememberRule?: boolean; ruleName?: string | null; serviceKey?: string | null };
export type InvoiceResultDto = { id: number | string; profileId: number | string; direction: string; reference: string; issueDate: string; accountingDate: string; currency: string; netAmount: Decimal; vatAmount: Decimal; grossAmount: Decimal; approvalStatus: string; paymentVerificationPolicy: string; paymentStatus: string | null };
