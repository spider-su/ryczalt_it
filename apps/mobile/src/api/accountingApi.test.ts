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
  it('loads reusable rules for a counterparty from the canonical resource', async () => {
    const client = { get: vi.fn(async () => []) };
    const api = new AccountingApi(client as never);
    await api.getCounterpartyRules(7, '12');
    expect(client.get).toHaveBeenCalledWith('/api/profiles/7/accounting/counterparties/12/rules');
  });
  it('posts to calculate with no request body, matching the backend controller', async () => {
    const client = { postEmpty: vi.fn(async () => ({})) };
    const api = new AccountingApi(client as never);
    await api.calculate(42, '2026-09');
    expect(client.postEmpty).toHaveBeenCalledWith('/api/profiles/42/accounting/periods/2026-09/calculate', { timeoutMs: 180_000 });
  });
  it('marks obligations manually paid and supports clearing the manual mark', async () => {
    const client = { postVoid: vi.fn(async () => undefined), delete: vi.fn(async () => undefined) };
    const api = new AccountingApi(client as never);
    await api.markObligationManuallyPaid(7, '2026-02', 10, '2026-03-25', 'Confirmed from bank statement');
    await api.clearObligationManualPayment(7, '2026-02', 10);
    expect(client.postVoid).toHaveBeenCalledWith('/api/profiles/7/accounting/periods/2026-02/obligations/10/manual-paid', { paidDate: '2026-03-25', note: 'Confirmed from bank statement' });
    expect(client.delete).toHaveBeenCalledWith('/api/profiles/7/accounting/periods/2026-02/obligations/10/manual-paid');
  });
  it('uses native invoice recognition and save routes', async () => {
    const client = { postForm: vi.fn(async () => ({})), post: vi.fn(async () => ({ invoice: {} })) };
    const api = new AccountingApi(client as never);
    await api.recognizeInvoice(42, { uri: 'file://invoice.pdf', name: 'invoice.pdf', type: 'application/pdf' });
    await api.createInvoice(42, { candidateKey: 'candidate-1', approve: true });
    expect(client.postForm).toHaveBeenCalledWith('/api/profiles/42/accounting/invoices/recognize', expect.any(FormData), { timeoutMs: 120_000 });
    expect(client.post).toHaveBeenCalledWith('/api/profiles/42/accounting/invoices', { candidateKey: 'candidate-1', approve: true });
  });
});
