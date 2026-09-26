import type { AccountingPeriod, Invoice, Obligation, PaymentHistoryLine } from '../../model/accounting';

export const july2026Invoices: Invoice[] = [
  { id: 'income-1', title: 'Acme Sp. z o.o.', subtitle: 'FV 5/2026 · 31 Jul', amount: { amount: '16250.00', currency: 'PLN' }, direction: 'SALE', counterparty: 'Acme Sp. z o.o.', legalName: 'Acme Sp. z o.o.', alias: null, taxIdentifier: null, documentNumber: 'FV 5/2026', issueDate: '2026-07-31', currency: 'PLN', importStatus: 'IMPORTED', approvalStatus: 'APPROVED', approvalSource: 'KSEF_TRUSTED', paymentVerificationPolicy: 'REQUIRED', paymentStatus: 'MATCHED', source: 'DEMO-KSEF-2026-001', category: null, sourceType: 'KSEF' },
  { id: 'cost-1', title: 'BP Europa', subtitle: 'Fuel · 2 Jul', amount: { amount: '828.33', currency: 'PLN' }, direction: 'PURCHASE', counterparty: 'BP Europa', legalName: 'BP Europa', alias: null, taxIdentifier: null, documentNumber: 'FV/7/2026', issueDate: '2026-07-02', currency: 'PLN', importStatus: 'IMPORTED', approvalStatus: 'APPROVED', approvalSource: 'COUNTERPARTY_RULE', paymentVerificationPolicy: 'NOT_REQUIRED', paymentStatus: 'NOT_REQUIRED', source: null, category: 'FUEL', sourceType: 'UPLOAD' },
  { id: 'cost-2', title: 'Adobe Systems', subtitle: 'INV/2026/071 · 18 Jul', amount: { amount: '246.00', currency: 'PLN' }, direction: 'PURCHASE', counterparty: 'Adobe Systems', legalName: 'Adobe Systems', alias: null, taxIdentifier: null, documentNumber: 'INV/2026/071', issueDate: '2026-07-18', currency: 'PLN', importStatus: 'IMPORTED', approvalStatus: 'APPROVED', approvalSource: 'MANUAL', paymentVerificationPolicy: 'REQUIRED', paymentStatus: 'PARTIALLY_MATCHED', source: null, category: 'SOFTWARE', sourceType: 'UPLOAD' },
  { id: 'cost-3', title: 'City Market', subtitle: 'FV/188/07 · 22 Jul', amount: { amount: '73.50', currency: 'PLN' }, direction: 'PURCHASE', counterparty: 'City Market', legalName: 'City Market', alias: null, taxIdentifier: null, documentNumber: 'FV/188/07', issueDate: '2026-07-22', currency: 'PLN', importStatus: 'IMPORTED', approvalStatus: 'NEEDS_REVIEW', approvalSource: null, paymentVerificationPolicy: 'REQUIRED', paymentStatus: 'UNMATCHED', source: null, category: null, sourceType: 'UPLOAD' }
];

export const july2026Obligations: Obligation[] = [
  { id: 'ryczalt-2026-07', title: 'RYCZALT', period: '2026-07', dueDate: '2026-08-20', amount: { amount: '5791.00', currency: 'PLN' }, paidAmount: { amount: '0.00', currency: 'PLN' }, outstandingAmount: { amount: '5791.00', currency: 'PLN' }, status: 'OPEN' },
  { id: 'vat-2026-07', title: 'VAT', period: '2026-07', dueDate: '2026-08-20', amount: { amount: '3557.00', currency: 'PLN' }, paidAmount: { amount: '0.00', currency: 'PLN' }, outstandingAmount: { amount: '3557.00', currency: 'PLN' }, status: 'OPEN' },
  { id: 'zus-2026-07', title: 'ZUS', period: '2026-07', dueDate: '2026-08-20', amount: { amount: '1495.04', currency: 'PLN' }, paidAmount: { amount: '0.00', currency: 'PLN' }, outstandingAmount: { amount: '1495.04', currency: 'PLN' }, status: 'OPEN' }
];

export const july2026: AccountingPeriod = {
  id: '2026-07', status: 'OPEN', summary: { revenue: { amount: '49159.00', currency: 'PLN' }, ryczalt: { amount: '5791.00', currency: 'PLN' }, vat: { amount: '3557.00', currency: 'PLN' }, zus: { amount: '1495.04', currency: 'PLN' } },
  documents: { invoiceCount: 4, transactionCount: 2 }, settlement: { expectedCount: 3, paidCount: 0, outstandingCount: 3, totalExpected: { amount: '10843.04', currency: 'PLN' }, totalPaid: { amount: '0.00', currency: 'PLN' }, totalOutstanding: { amount: '10843.04', currency: 'PLN' }, fullySettled: false },
  reconciliation: { rowCount: 2, settledCount: 2, mismatchCount: 0, missingEvidenceCount: 0, state: 'healthy' }, completeness: { status: 'COMPLETE', blockingIssueCount: 0 }, calculations: [{ type: 'RYCZALT', status: 'CALCULATED', amount: { amount: '5791.00', currency: 'PLN' } }, { type: 'VAT', status: 'CALCULATED', amount: { amount: '3557.00', currency: 'PLN' } }, { type: 'ZUS', status: 'CALCULATED', amount: { amount: '1495.04', currency: 'PLN' } }], allowedActions: [], invoices: july2026Invoices, transactions: [], obligations: july2026Obligations, issues: []
};

export const july2026PaymentHistory: PaymentHistoryLine[] = [];
