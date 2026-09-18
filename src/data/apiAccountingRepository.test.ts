import { describe, expect, it, vi } from 'vitest';
import { ApiAccountingRepository } from './apiAccountingRepository';
import type { AccountingApi } from '../api/accountingApi';

describe('ApiAccountingRepository', () => {
  it('fetches only documents for a multi-month document range', async () => {
    const api = {
      getDocuments: vi.fn(async (_profileId: number, month: string) => [{
        id: Number(month.slice(-2)), type: 'SALE', counterparty: 'Client', documentNumber: null,
        issueDate: `${month}-10`, saleDate: null, category: null, source: null, amount: 100,
        currency: 'PLN', status: null, sourceType: null, sourceTypeLabel: null, categoryLabel: null,
        importStatus: null, reviewStatus: null, paymentStatus: 'PAID'
      }]),
      getMonth: vi.fn()
    } as unknown as AccountingApi;

    const repository = new ApiAccountingRepository(api, 1);
    const documents = await repository.getDocumentsForRange('2026-09', 3);

    expect(documents).toHaveLength(3);
    expect(api.getDocuments).toHaveBeenCalledTimes(3);
    expect(api.getMonth).not.toHaveBeenCalled();
  });
});
