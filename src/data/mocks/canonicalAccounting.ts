import type { AccountingPeriod, CounterpartyRule, Invoice } from '../../model/accounting';
import type { InvoiceCandidateDto } from '../../api/dto/accounting';

const money = (amount: string, currency = 'PLN') => ({ amount, currency });
const baseInvoice = (overrides: Partial<Invoice>): Invoice => ({ id: 'invoice-1', title: 'Supplier', amount: money('100.00'), direction: 'PURCHASE', counterparty: 'Supplier', legalName: 'Supplier', alias: null, taxIdentifier: null, documentNumber: 'FV/1', issueDate: '2026-09-01', currency: 'PLN', importStatus: 'IMPORTED', approvalStatus: 'NEEDS_REVIEW', approvalSource: null, paymentVerificationPolicy: 'REQUIRED', paymentStatus: 'UNMATCHED', source: 'UPLOAD', category: null, sourceType: 'UPLOAD', ...overrides });
export const cashFuelInvoice = baseInvoice({ title: 'Orlen', counterparty: 'Orlen', category: 'FUEL', approvalStatus: 'APPROVED', approvalSource: 'COUNTERPARTY_RULE', paymentVerificationPolicy: 'NOT_REQUIRED', paymentStatus: 'NOT_REQUIRED' });
export const bankRequiredUnmatchedInvoice = baseInvoice({ paymentVerificationPolicy: 'REQUIRED', paymentStatus: 'UNMATCHED' });
export const invoiceNeedingReview = baseInvoice({ approvalStatus: 'NEEDS_REVIEW', paymentVerificationPolicy: 'REQUIRED', paymentStatus: 'UNMATCHED' });

export const completeUnpaidPeriod: AccountingPeriod = {
  id: '2026-09', status: 'OPEN', summary: { revenue: money('12000.00'), ryczalt: money('1440.00'), vat: money('2000.00'), zus: money('1495.04') }, documents: { invoiceCount: 17, transactionCount: 15 }, settlement: { expectedCount: 3, paidCount: 1, outstandingCount: 2, totalExpected: money('4935.04'), totalPaid: money('2000.00'), totalOutstanding: money('2935.04'), fullySettled: false }, reconciliation: { rowCount: 15, settledCount: 12, mismatchCount: 1, missingEvidenceCount: 2, state: 'missing_evidence' }, completeness: { status: 'COMPLETE', blockingIssueCount: 0 }, allowedActions: ['SETTLE'], invoices: [cashFuelInvoice, bankRequiredUnmatchedInvoice], transactions: [], obligations: [], issues: []
};
export const fullySettledPeriod: AccountingPeriod = { ...completeUnpaidPeriod, settlement: { ...completeUnpaidPeriod.settlement, paidCount: 3, outstandingCount: 0, totalPaid: money('4935.04'), totalOutstanding: money('0.00'), fullySettled: true }, allowedActions: [] };
export const incompletePeriod: AccountingPeriod = { ...completeUnpaidPeriod, completeness: { status: 'INCOMPLETE', blockingIssueCount: 1 }, issues: [{ id: 'issue-1', code: 'MISSING_EVIDENCE', severity: 'BLOCKING', kind: 'BLOCKED', title: 'Missing evidence', message: 'Evidence is missing', sourceReference: null }] };

const candidateBase: InvoiceCandidateDto = { candidateKey: 'candidate-1', sourceType: 'UPLOAD', sourceExternalId: 'sha256:invoice', documentType: 'INVOICE', direction: 'COST', issueDate: '2026-09-01', saleDate: null, dueDate: null, reference: 'FV/1', counterpartyId: 1, currency: 'PLN', netAmount: '100.00', vatAmount: '23.00', grossAmount: '123.00', classification: 'FUEL', vatTreatment: null, ryczaltRate: '3.00', approvalStatus: 'APPROVED', approvalMethod: 'COUNTERPARTY_RULE', paymentVerificationPolicy: 'NOT_REQUIRED', paymentStatus: 'NOT_REQUIRED', duplicate: false, periodYear: 2026, periodMonth: 9, requiredInputs: [] };
export const recognitionWithNoRequiredInputs: InvoiceCandidateDto = candidateBase;
export const recognitionWithRequiredInputs: InvoiceCandidateDto = { ...candidateBase, approvalStatus: 'NEEDS_REVIEW', classification: null, requiredInputs: [{ field: 'classification', inputType: 'STRING', required: true, options: [{ value: 'FUEL', labelKey: 'Fuel' }], dependsOn: null, dependsOnValues: [] }] };
export const counterpartyWithMultipleRules: CounterpartyRule[] = [
  { id: 'fuel', name: 'Fuel', sourceType: 'UPLOAD', documentType: 'INVOICE', serviceKey: 'FUEL', classification: 'FUEL', vatTreatment: null, vatDeductionRatio: '50.00', ryczaltRate: '0.00', autoApprove: true, paymentVerificationPolicy: 'NOT_REQUIRED' },
  { id: 'wash', name: 'Car wash', sourceType: 'UPLOAD', documentType: 'INVOICE', serviceKey: 'CAR_WASH', classification: 'VEHICLE_SERVICE', vatTreatment: null, vatDeductionRatio: '50.00', ryczaltRate: '0.00', autoApprove: false, paymentVerificationPolicy: 'REQUIRED' },
  { id: 'other', name: 'Other purchase', sourceType: null, documentType: 'INVOICE', serviceKey: 'OTHER', classification: null, vatTreatment: null, vatDeductionRatio: null, ryczaltRate: null, autoApprove: false, paymentVerificationPolicy: 'REQUIRED' }
];
