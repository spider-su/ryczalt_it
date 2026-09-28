import { describe, expect, it, vi } from 'vitest';
import { ApiAccountingRepository, PartialAccountingError } from './apiAccountingRepository';
import { mergeAccountingMonthParts } from './accountingRepository';

describe('ApiAccountingRepository', () => {
  it('retains successful home sections when a refresh fails in another section', () => {
    const previous = { period: { id: '2026-09' } as never, invoices: [{ id: 'kept' }] as never, transactions: [] as never, obligations: [{ id: 'zus' }] as never, issues: [] as never, failures: {} };
    const incoming = { period: null, invoices: null, transactions: [], obligations: null, issues: [], failures: { period: new Error('offline'), invoices: new Error('offline'), obligations: new Error('offline') } };
    const merged = mergeAccountingMonthParts(previous, incoming, '2026-09', '2026-09');
    expect(merged.period?.id).toBe('2026-09');
    expect(merged.invoices?.[0]?.id).toBe('kept');
    expect(merged.obligations?.[0]?.id).toBe('zus');
    expect(merged.transactions).toEqual([]);
    expect(merged.failures.period).toBeInstanceOf(Error);
  });

  it('does not carry data from a different selected accounting month', () => {
    const previous = { period: { id: '2026-08' } as never, invoices: [] as never, transactions: [] as never, obligations: [] as never, issues: [] as never, failures: {} };
    const incoming = { period: null, invoices: null, transactions: [], obligations: null, issues: [], failures: { period: new Error('offline') } };
    expect(mergeAccountingMonthParts(previous, incoming, '2026-08', '2026-09')).toBe(incoming);
  });

  it('fetches canonical invoices for each selected month', async () => {
    const api = { getInvoices: vi.fn(async (_profileId: number, month: string) => [{ id: month, direction: 'INCOME', reference: null, issueDate: `${month}-10`, accountingDate: `${month}-10`, netAmount: '81.30', vatAmount: '18.70', grossAmount: '100.00', currency: 'PLN', bookedNetPln: '81.30', ryczaltRate: '3.00', deductibleVat: '18.70', counterparty: null, approvalStatus: 'APPROVED', approvalMethod: 'MANUAL', paymentVerificationPolicy: 'REQUIRED' }]) };
    const repository = new ApiAccountingRepository(api as never, 1);
    const invoices = await repository.getInvoicesForRange('2026-09', 3);
    expect(invoices).toHaveLength(3); expect(api.getInvoices).toHaveBeenCalledTimes(3); expect(api.getInvoices).toHaveBeenCalledWith(1, '2026-09');
  });

  it('does not request invoice months before January 2026', async () => {
    const api = { getInvoices: vi.fn(async (_profileId: number, month: string) => [{ id: month, direction: 'INCOME', reference: null, issueDate: `${month}-10`, accountingDate: `${month}-10`, netAmount: '81.30', vatAmount: '18.70', grossAmount: '100.00', currency: 'PLN', bookedNetPln: '81.30', ryczaltRate: '3.00', deductibleVat: '18.70', counterparty: null, approvalStatus: 'APPROVED', approvalMethod: 'MANUAL', paymentVerificationPolicy: 'REQUIRED' }]) };
    const repository = new ApiAccountingRepository(api as never, 1);
    await repository.getInvoicesForRange('2026-02', 3);
    expect(api.getInvoices.mock.calls.map((call) => call[1])).toEqual(['2026-02', '2026-01']);
  });

  it('does not present a month as complete when one dataset fails', async () => {
    const api = {
      getPeriod: vi.fn(async () => { throw new Error('status unavailable'); }),
      getInvoices: vi.fn(async () => []),
      getTransactions: vi.fn(async () => []),
      getObligations: vi.fn(async () => []),
      getIssues: vi.fn(async () => [])
    };
    await expect(new ApiAccountingRepository(api as never, 1).getMonth('2026-09')).rejects.toBeInstanceOf(PartialAccountingError);
  });

  it('retains successful month parts when another dataset fails', async () => {
    const api = {
      getPeriod: vi.fn(async () => { throw new Error('status unavailable'); }),
      getInvoices: vi.fn(async () => [{ id: 7, direction: 'INCOME', reference: 'FV/7', issueDate: '2026-09-10', accountingDate: '2026-09-10', netAmount: '81.30', vatAmount: '18.70', grossAmount: '100.00', currency: 'PLN', bookedNetPln: null, ryczaltRate: null, deductibleVat: null, counterparty: null, approvalStatus: null, approvalMethod: null, paymentVerificationPolicy: null, paymentStatus: 'UNMATCHED', sourceType: 'KSEF', sourceReference: null }]),
      getTransactions: vi.fn(async () => []),
      getObligations: vi.fn(async () => []),
      getIssues: vi.fn(async () => [])
    };
    const parts = await new ApiAccountingRepository(api as never, 1).getMonthParts('2026-09');
    expect(parts.period).toBeNull();
    expect(parts.invoices).toHaveLength(1);
    expect(parts.failures.period).toBeInstanceOf(Error);
  });
});
