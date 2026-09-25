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
