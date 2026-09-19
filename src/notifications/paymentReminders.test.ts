import { describe, expect, it } from 'vitest';
import { isPaymentReminderEligible, parseLocalDate, reminderCopy, reminderDate, reminderKey } from './paymentReminders';
import type { PaymentLine } from '../model/accounting';

const payment = (overrides: Partial<PaymentLine> = {}): PaymentLine => ({ id: 'VAT', title: 'VAT', period: '2026-12', dueDate: '2026-12-20', amount: { amount: '100.00', currency: 'PLN' }, paidAmount: { amount: '0.00', currency: 'PLN' }, outstandingAmount: { amount: '100.00', currency: 'PLN' }, status: 'DUE', ...overrides });

describe('payment reminder policy', () => {
  it('uses authoritative pending status and rejects unknown, resolved, and incomplete payments', () => {
    expect(isPaymentReminderEligible(payment())).toBe(true);
    expect(isPaymentReminderEligible(payment({ status: 'PAID' }))).toBe(false);
    expect(isPaymentReminderEligible(payment({ status: 'NEW_BACKEND_STATUS' }))).toBe(false);
    expect(isPaymentReminderEligible(payment({ dueDate: null }))).toBe(false);
    expect(isPaymentReminderEligible(payment({ title: 'UNKNOWN' }))).toBe(false);
    expect(isPaymentReminderEligible(payment({ status: null as never }))).toBe(false);
    expect(isPaymentReminderEligible(payment({ status: '' }))).toBe(false);
    expect(isPaymentReminderEligible(payment({ status: '   ' }))).toBe(false);
  });

  it('parses calendar dates in local time and rejects invalid dates', () => {
    expect(parseLocalDate('2026-12-20')?.getHours()).toBe(9);
    expect(parseLocalDate('2026-02-30')).toBeNull();
    expect(parseLocalDate('2026-12-20T00:00:00Z')).toBeNull();
    expect(parseLocalDate('2028-02-29')?.getDate()).toBe(29);
    expect(parseLocalDate('2027-02-29')).toBeNull();
  });

  it('does not schedule in the past and keeps stable profile-scoped identity', () => {
    expect(reminderDate(payment(), 3, new Date(2026, 11, 16, 8))).toEqual(new Date(2026, 11, 17, 9));
    expect(reminderDate(payment(), 3, new Date(2026, 11, 17, 9))).toBeNull();
    expect(reminderKey(7, payment(), 3, 'pl')).toBe('7:2026-12:VAT:2026-12-20:3:pl');
  });

  it('keeps lock-screen copy private and does not turn a missing amount into zero', () => {
    expect(reminderCopy(payment({ amount: { amount: null, currency: 'PLN' } }), 'pl').body).not.toContain('0');
    expect(reminderCopy(payment(), 'en').body).not.toContain('VAT_RATE');
  });
});
