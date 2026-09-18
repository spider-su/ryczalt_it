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

  it('uses the authenticated profile-scoped GET and PUT routes with canonical payload', async () => {
    const client = { get: vi.fn(async () => ({ enabled: true, maxAmount: '1000.00', trustedCategories: ['ACCOUNTING_SERVICE'] })), put: vi.fn(async (_path: string, body: unknown) => body) };
    const api = new AccountingApi(client as never);
    await api.getAutoApprovalSettings(42);
    await api.updateAutoApprovalSettings(42, { enabled: false, maxAmount: '1234567.89', trustedCategories: ['FUTURE_CATEGORY'] });
    expect(client.get).toHaveBeenCalledWith('/api/v1/profiles/42/accounting/auto-approval');
    expect(client.put).toHaveBeenCalledWith('/api/v1/profiles/42/accounting/auto-approval', { enabled: false, maxAmount: '1234567.89', trustedCategories: ['FUTURE_CATEGORY'] });
  });
});
