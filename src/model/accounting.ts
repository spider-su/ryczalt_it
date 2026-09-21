export type Money = { amount: string | null; currency?: string | null };
export type Invoice = {
  id: string; title: string; subtitle?: string; amount: Money; direction: 'SALE' | 'PURCHASE' | 'UNKNOWN'; counterparty: string | null; legalName: string | null; alias: string | null; taxIdentifier: string | null;
  documentNumber: string | null; issueDate: string | null; currency: string | null; importStatus: string | null; approvalStatus: string | null; approvalSource: string | null;
  paymentVerificationPolicy: string | null; paymentStatus: string | null; source: string | null; category: string | null; sourceType: string | null; documentKind?: string | null; correctsInvoiceId?: string | null; correctsInvoiceReference?: string | null;
};
export type Transaction = { id: string; date: string | null; description: string | null; amount: Money; status: string | null };
export type Obligation = { id: string; title: string; period: string; dueDate: string | null; amount: Money; paidAmount: Money; outstandingAmount: Money; status: string };
export type PaymentHistoryLine = Obligation & { paymentDate: string | null };
export type AccountingIssue = { id: string; code: string; severity: string; kind: string; title: string | null; message: string | null; sourceReference: string | null };
export type AccountingPeriod = {
  id: string; status: string; summary: { revenue: Money; ryczalt: Money; vat: Money; zus: Money }; documents: { invoiceCount: number; transactionCount: number };
  settlement: { expectedCount: number; paidCount: number; outstandingCount: number; totalExpected: Money; totalPaid: Money; totalOutstanding: Money; fullySettled: boolean };
  reconciliation: { rowCount: number; settledCount: number; mismatchCount: number; missingEvidenceCount: number; state: 'healthy' | 'mismatch' | 'missing_evidence' | 'unknown' };
  completeness: { status: string; blockingIssueCount: number }; allowedActions: string[]; invoices: Invoice[]; transactions: Transaction[]; obligations: Obligation[]; issues: AccountingIssue[];
};
export type Counterparty = { id: string; legalName: string; alias: string | null; displayName: string; taxIdentifier: string | null; country: string | null; ruleCount: number; invoiceCount: number };
export type CounterpartyRule = { id: string; name: string; sourceType: string | null; documentType: string | null; serviceKey: string | null; classification: string | null; vatTreatment: string | null; vatDeductionRatio: string | null; ryczaltRate: string | null; autoApprove: boolean; paymentVerificationPolicy: string };
