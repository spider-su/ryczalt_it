import type { AccountingRepository } from './accountingRepository';
import type { AccountingPeriod, Counterparty, Invoice, PaymentHistoryLine } from '../model/accounting';
import { july2026, july2026Invoices, july2026PaymentHistory } from './mocks/july2026';
import type { InvoiceCandidateDto } from '../api/dto/accounting';

const mockCounterparties: Counterparty[] = [{ id: 'bp-1', legalName: 'BP Europa', alias: null, displayName: 'BP Europa', taxIdentifier: 'PL1234567890', country: 'PL', ruleCount: 1, invoiceCount: 1 }];
const demoInvoices: Invoice[] = [...july2026Invoices];

export function addDemoCost(candidate: InvoiceCandidateDto, classification: string | null): void {
  demoInvoices.unshift({
    id: `demo-cost-${demoInvoices.length + 1}`, title: 'BP Europa', subtitle: `${candidate.reference ?? 'New invoice'} · ${candidate.issueDate ?? '2026-07-15'}`,
    amount: { amount: candidate.grossAmount, currency: candidate.currency }, direction: 'PURCHASE', counterparty: 'BP Europa', legalName: 'BP Europa', alias: null,
    taxIdentifier: 'PL1234567890', documentNumber: candidate.reference, issueDate: candidate.issueDate, currency: candidate.currency,
    importStatus: 'IMPORTED', approvalStatus: candidate.approvalStatus ?? 'NEEDS_REVIEW', approvalSource: candidate.approvalMethod,
    paymentVerificationPolicy: candidate.paymentVerificationPolicy ?? 'REQUIRED', paymentStatus: candidate.paymentStatus ?? 'UNMATCHED',
    source: 'UPLOAD', sourceType: candidate.sourceType, category: classification
  });
}

export class MockAccountingRepository implements AccountingRepository {
  async getPeriods(): Promise<unknown[]> { return [{ month: july2026.id, status: july2026.status }]; }
  async getMonth(_month: string): Promise<AccountingPeriod> { return { ...july2026, documents: { ...july2026.documents, invoiceCount: demoInvoices.length }, invoices: [...demoInvoices] }; }
  async getInvoicesForRange(_month: string, _months: number): Promise<Invoice[]> { return [...demoInvoices]; }
  async getCounterpartyInvoices(counterpartyId: string): Promise<Invoice[]> { const counterparty = mockCounterparties.find((item) => item.id === counterpartyId); return demoInvoices.filter((invoice) => invoice.legalName === counterparty?.legalName); }
  async markInvoiceManuallyPaid(_invoiceId: string, _paidDate: string, _note?: string): Promise<void> {}
  async clearInvoiceManualPayment(_invoiceId: string): Promise<void> {}
  async getPaymentHistory(_month: string, _type?: string): Promise<PaymentHistoryLine[]> { return july2026PaymentHistory; }
  async getCounterparties(): Promise<Counterparty[]> { return mockCounterparties.map((item) => ({ ...item, invoiceCount: demoInvoices.filter((invoice) => invoice.legalName === item.legalName).length })); }
  async performPeriodAction(_month: string, _action: 'SETTLE' | 'FREEZE' | 'REOPEN'): Promise<void> {}
}

export const accountingRepository: AccountingRepository = new MockAccountingRepository();
