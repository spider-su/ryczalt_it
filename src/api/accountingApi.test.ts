import { describe, expect, it, vi } from 'vitest';
import { AccountingApi } from './accountingApi';

describe('canonical AccountingApi', () => {
  it('requests canonical period resources and payment history', async () => {
    const client = { get: vi.fn(async () => []) };
    const api = new AccountingApi(client as never);
    await api.getPeriod(7, '2026-09');
    await api.getInvoices(7, '2026-09');
    await api.getPayments(7, '2026-08', '2026-09', 'VAT');
    expect(client.get).toHaveBeenNthCalledWith(1, '/api/profiles/7/accounting/periods/2026-09');
    expect(client.get).toHaveBeenNthCalledWith(2, '/api/profiles/7/accounting/periods/2026-09/invoices');
    expect(client.get).toHaveBeenNthCalledWith(3, '/api/profiles/7/accounting/payments?from=2026-08&to=2026-09&type=VAT');
  });
  it('uses native invoice recognition and save routes', async () => {
    const client = { postForm: vi.fn(async () => ({})), post: vi.fn(async () => ({ invoice: {} })) };
    const api = new AccountingApi(client as never);
    await api.recognizeInvoice(42, { uri: 'file://invoice.pdf', name: 'invoice.pdf', type: 'application/pdf' });
    await api.createInvoice(42, { candidateKey: 'candidate-1', approve: true });
    expect(client.postForm).toHaveBeenCalledWith('/api/profiles/42/accounting/invoices/recognize', expect.any(FormData));
    expect(client.post).toHaveBeenCalledWith('/api/profiles/42/accounting/invoices', { candidateKey: 'candidate-1', approve: true });
  });
});
