import { describe, expect, it } from 'vitest';
import { accounting2026Periods, paymentHistoryForMonth } from './accounting2026';

describe('2026 demo accounting months', () => {
  it('provides every month from January through the current September period', () => {
    expect(accounting2026Periods.map((period) => period.id)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'
    ]);
  });

  it('marks all periods before August fully settled', () => {
    expect(accounting2026Periods.slice(0, 7).every((period) => period.settlement.fullySettled)).toBe(true);
    expect(accounting2026Periods.slice(0, 7).every((period) => period.obligations.every((item) => item.status === 'PAID'))).toBe(true);
  });

  it('shows August as partially settled with remaining balances and payment history', () => {
    const august = accounting2026Periods[7]!;
    expect(august.settlement.fullySettled).toBe(false);
    expect(august.obligations.map((item) => item.status)).toEqual(['OPEN', 'PARTIALLY_PAID', 'OPEN']);
    expect(august.settlement.totalOutstanding.amount).toBe('13302.04');
    expect(paymentHistoryForMonth('2026-08')).toHaveLength(1);
    expect(paymentHistoryForMonth('2026-08')[0]!.outstandingAmount.amount).toBe('4769.00');
  });

  it('keeps September current and awaiting calculations', () => {
    const september = accounting2026Periods[8]!;
    expect(september.calculations).toHaveLength(0);
    expect(september.obligations).toHaveLength(0);
    expect(september.completeness.status).toBe('INCOMPLETE');
  });
});
