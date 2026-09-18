import { describe, expect, it, vi } from 'vitest';
import { AccountingApi } from './accountingApi';
import type { HttpClient } from './client';

describe('AccountingApi routes', () => {
  it('always sends the selected period for payment history', async () => {
    const get = vi.fn(async () => []);
    const api = new AccountingApi({ get } as unknown as HttpClient);

    await api.getPaymentHistory(7, '2026-09', '2026-09');
    await api.getPaymentHistory(7, '2026-08', '2026-09', 'VAT');

    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/profiles/7/accounting/payments/history?from=2026-09&to=2026-09');
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/profiles/7/accounting/payments/history?from=2026-08&to=2026-09&type=VAT');
  });
});
