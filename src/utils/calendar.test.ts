import { describe, expect, it } from 'vitest';
import { clampAccountingMonth, currentLocalAccountingMonth, isAccountingMonthAllowed, MIN_ACCOUNTING_MONTH } from './calendar';

describe('local accounting calendar', () => {
  it('uses the device calendar month rather than UTC month', () => {
    expect(currentLocalAccountingMonth(new Date(2026, 8, 30, 23, 59))).toBe('2026-09');
    expect(currentLocalAccountingMonth(new Date(2026, 9, 1, 0, 1))).toBe('2026-10');
  });

  it('limits selectable accounting months to January 2026 and later', () => {
    expect(MIN_ACCOUNTING_MONTH).toBe('2026-01');
    expect(isAccountingMonthAllowed('2025-12')).toBe(false);
    expect(isAccountingMonthAllowed('2026-01')).toBe(true);
    expect(clampAccountingMonth('2025-12')).toBe('2026-01');
    expect(clampAccountingMonth('2026-07')).toBe('2026-07');
  });
});
