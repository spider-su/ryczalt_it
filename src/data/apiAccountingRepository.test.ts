import { describe, expect, it, vi } from 'vitest';
import { ApiAccountingRepository } from './apiAccountingRepository';

describe('ApiAccountingRepository', () => {
  it('fetches canonical invoices for each selected month', async () => {
    const api = { getInvoices: vi.fn(async (_profileId: number, month: string) => [{ id: month, direction: 'INCOME', reference: null, issueDate: `${month}-10`, accountingDate: `${month}-10`, netAmount: '81.30', vatAmount: '18.70', grossAmount: '100.00', currency: 'PLN', bookedNetPln: '81.30', ryczaltRate: '3.00', deductibleVat: '18.70', counterparty: null, approvalStatus: 'APPROVED', approvalMethod: 'MANUAL', paymentVerificationPolicy: 'REQUIRED' }]) };
    const repository = new ApiAccountingRepository(api as never, 1);
    const invoices = await repository.getInvoicesForRange('2026-09', 3);
    expect(invoices).toHaveLength(3); expect(api.getInvoices).toHaveBeenCalledTimes(3); expect(api.getInvoices).toHaveBeenCalledWith(1, '2026-09');
  });
});
