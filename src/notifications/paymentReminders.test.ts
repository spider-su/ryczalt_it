import { describe, expect, it } from 'vitest';
import { isPaymentReminderEligible, reminderDate } from './paymentReminders';
import type { Obligation } from '../model/accounting';

const payment = (overrides: Partial<Obligation> = {}): Obligation => ({ id: 'VAT', title: 'VAT', period: '2026-12', dueDate: '2026-12-20', amount: { amount: '100.00', currency: 'PLN' }, paidAmount: { amount: '0.00', currency: 'PLN' }, outstandingAmount: { amount: '100.00', currency: 'PLN' }, status: 'OPEN', ...overrides });
describe('canonical payment reminder policy', () => { it('uses canonical statuses and rejects resolved/unknown values', () => { expect(isPaymentReminderEligible(payment())).toBe(true); expect(isPaymentReminderEligible(payment({ status: 'PAID' }))).toBe(false); expect(isPaymentReminderEligible(payment({ status: 'FUTURE' }))).toBe(false); }); it('does not schedule in the past', () => { expect(reminderDate(payment(), 3, new Date(2026, 11, 16, 8))).toEqual(new Date(2026, 11, 17, 9)); expect(reminderDate(payment(), 3, new Date(2026, 11, 17, 9))).toBeNull(); }); });
