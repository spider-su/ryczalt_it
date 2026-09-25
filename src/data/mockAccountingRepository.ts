import type { AccountingRepository } from './accountingRepository';
import type { AccountingPeriod, Counterparty, CounterpartyRule, Invoice, PaymentHistoryLine } from '../model/accounting';
import { accounting2026Invoices, accounting2026Periods, paymentHistoryForMonth } from './mocks/accounting2026';
import type { InvoiceCandidateDto } from '../api/dto/accounting';
import { normalizeManualDecimal, type ManualCostDraft } from '../presentation/costPresentation';

const mockCounterparties: Counterparty[] = [{ id: 'bp-1', legalName: 'BP Europa', alias: null, displayName: 'BP Europa', taxIdentifier: 'PL1234567890', country: 'PL', ruleCount: 1, invoiceCount: 1 }];
const demoInvoices: Invoice[] = [...accounting2026Invoices];
const demoManualObligations = new Set<string>();

function currentDemoObligations(month: string) {
  const period = accounting2026Periods.find((item) => item.id === month);
  return (period?.obligations ?? []).map((obligation) => demoManualObligations.has(`${month}:${obligation.id}`)
    ? { ...obligation, paidAmount: { ...obligation.amount }, outstandingAmount: { ...obligation.amount, amount: '0.00' }, status: 'PAID' }
    : { ...obligation });
}

function sumDemoMoney(values: (string | null)[]): string {
  const cents = values.reduce((sum, value) => {
    const [whole = '0', fraction = ''] = (value ?? '0').split('.');
    return sum + BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  }, 0n);
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

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

export function addDemoManualCost(draft: ManualCostDraft): void {
  const grossAmount = normalizeManualDecimal(draft.grossAmount);
  if (grossAmount == null) throw new Error('Invalid mock invoice amount');
  const name = draft.counterparty.trim();
  demoInvoices.unshift({
    id: `demo-manual-cost-${demoInvoices.length + 1}`,
    title: name,
    subtitle: `${draft.reference.trim()} · ${draft.issueDate.trim()}`,
    amount: { amount: grossAmount, currency: draft.currency.trim().toUpperCase() },
    direction: 'PURCHASE',
    counterparty: name,
    legalName: name,
    alias: null,
    taxIdentifier: draft.taxIdentifier.trim() || null,
    documentNumber: draft.reference.trim(),
    issueDate: draft.issueDate.trim(),
    dueDate: draft.dueDate.trim() || null,
    netAmount: normalizeManualDecimal(draft.netAmount),
    vatAmount: normalizeManualDecimal(draft.vatAmount),
    currency: draft.currency.trim().toUpperCase(),
    importStatus: null,
    approvalStatus: 'NEEDS_REVIEW',
    approvalSource: null,
    paymentVerificationPolicy: 'REQUIRED',
    paymentStatus: 'UNMATCHED',
    source: null,
    category: null,
    sourceType: 'MANUAL'
  });
}

export class MockAccountingRepository implements AccountingRepository {
  async getPeriods(): Promise<unknown[]> { return accounting2026Periods.map(({ id, status }) => ({ month: id, status })); }
  async getMonth(month: string): Promise<AccountingPeriod> {
    const period = accounting2026Periods.find((item) => item.id === month) ?? accounting2026Periods[8]!;
    const invoices = demoInvoices.filter((invoice) => invoice.issueDate?.startsWith(month));
    const obligations = currentDemoObligations(month);
    const totalPaid = sumDemoMoney(obligations.map((item) => item.paidAmount.amount));
    const totalOutstanding = sumDemoMoney(obligations.map((item) => item.outstandingAmount.amount));
    const paidCount = obligations.filter((item) => ['PAID', 'OVERPAID'].includes(item.status)).length;
    return { ...period, documents: { ...period.documents, invoiceCount: invoices.length }, invoices, obligations, settlement: { ...period.settlement, paidCount, outstandingCount: obligations.length - paidCount, totalPaid: { ...period.settlement.totalPaid, amount: totalPaid }, totalOutstanding: { ...period.settlement.totalOutstanding, amount: totalOutstanding }, fullySettled: obligations.length > 0 && totalOutstanding === '0.00' } };
  }
  async getInvoicesForRange(month: string, months: number): Promise<Invoice[]> {
    const [year = 2026, monthNumber = 9] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1 - months + 1, 1));
    const startMonth = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    return demoInvoices.filter((invoice) => { const invoiceMonth = invoice.issueDate?.slice(0, 7); return invoiceMonth != null && invoiceMonth >= startMonth && invoiceMonth <= month; });
  }
  async getCounterpartyInvoices(counterpartyId: string): Promise<Invoice[]> { const counterparty = mockCounterparties.find((item) => item.id === counterpartyId); return demoInvoices.filter((invoice) => invoice.legalName === counterparty?.legalName); }
  async markInvoiceManuallyPaid(_invoiceId: string, _paidDate: string, _note?: string): Promise<void> {}
  async clearInvoiceManualPayment(_invoiceId: string): Promise<void> {}
  async markObligationManuallyPaid(month: string, obligationId: string, _paidDate: string, _note?: string): Promise<void> { demoManualObligations.add(`${month}:${obligationId}`); }
  async clearObligationManualPayment(month: string, obligationId: string): Promise<void> { demoManualObligations.delete(`${month}:${obligationId}`); }
  async getPaymentHistory(month: string, type?: string): Promise<PaymentHistoryLine[]> {
    const period = accounting2026Periods.find((item) => item.id === month);
    const history: PaymentHistoryLine[] = currentDemoObligations(month).filter((item) => BigInt((item.paidAmount.amount ?? '0').replace('.', '')) > 0n).map((item) => ({ ...item, paymentDate: item.status === 'PAID' ? `${month}-28` : `${month}-25` }));
    const payments = period ? history : paymentHistoryForMonth(month);
    return type ? payments.filter((line) => line.title === type) : payments;
  }
  async getCounterparties(): Promise<Counterparty[]> { return mockCounterparties.map((item) => ({ ...item, invoiceCount: demoInvoices.filter((invoice) => invoice.legalName === item.legalName).length })); }
  async getCounterpartyRules(_counterpartyId: string): Promise<CounterpartyRule[]> { return []; }
  async calculatePeriod(_month: string): Promise<void> { throw new Error('Calculation refresh is unavailable in the local demo.'); }
  async performPeriodAction(_month: string, _action: 'FREEZE' | 'REOPEN'): Promise<void> {}
}

export const accountingRepository: AccountingRepository = new MockAccountingRepository();
