import { afterEach, describe, expect, it } from 'vitest';
import { MockAccountingRepository } from './mockAccountingRepository';

describe('mock manual obligation payments', () => {
  const repository = new MockAccountingRepository();

  afterEach(async () => {
    await repository.clearObligationManualPayment('2026-08', 'ryczalt-2026-08');
  });

  it('reflects a manual payment in the obligation and settlement summary', async () => {
    await repository.markObligationManuallyPaid('2026-08', 'ryczalt-2026-08', '2026-09-25', 'Paid manually');
    const period = await repository.getMonth('2026-08');
    const obligation = period.obligations.find((item) => item.id === 'ryczalt-2026-08');

    expect(obligation?.status).toBe('PAID');
    expect(obligation?.outstandingAmount.amount).toBe('0.00');
    expect(period.settlement.totalPaid.amount).toBe('8238.00');
    expect(period.settlement.totalOutstanding.amount).toBe('6264.04');
  });
});

describe('mock accounting demo data', () => {
  it('provides a consistent populated August period across Home, Invoices, and Settlements', async () => {
    const repository = new MockAccountingRepository();
    const period = await repository.getMonth('2026-08');
    const invoices = await repository.getInvoicesForRange('2026-08', 1);
    const payments = await repository.getPaymentHistory('2026-08');

    expect(period.invoices.length).toBeGreaterThan(0);
    expect(period.invoices.every((invoice) => invoice.amount.amount != null)).toBe(true);
    expect(invoices.map((invoice) => invoice.id).sort()).toEqual(period.invoices.map((invoice) => invoice.id).sort());
    expect(period.obligations.length).toBe(3);
    expect(period.obligations.every((obligation) => obligation.amount.amount != null)).toBe(true);
    expect(period.summary.ryczalt.amount).not.toBe('0.00');
    expect(period.summary.vat.amount).not.toBe('0.00');
    expect(period.settlement.totalOutstanding.amount).toBe('13302.04');
    expect(payments.some((payment) => payment.status === 'PARTIALLY_PAID')).toBe(true);
  });
});
