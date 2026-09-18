import { describe, expect, it } from 'vitest';
import { dateMatches, issuePriority, matchesInvoice, paymentMatches, statusForIssue, statusForMonth, statusForPayment } from './accounting';
import { mapDirection } from '../api/mappers/accountingMapper';
import type { AccountingIssue, AccountingLine, PaymentLine } from '../model/accounting';

const line = (overrides: Partial<AccountingLine> = {}): AccountingLine => ({ id: '1', title: 'Adobe', amount: { amount: 249, currency: 'PLN' }, issueDate: '2026-09-16', documentNumber: 'FV/1', direction: 'PURCHASE', ...overrides });
const payment = (status: string): PaymentLine => ({ id: status, title: 'VAT', dueDate: '2026-09-25', amount: { amount: 100, currency: 'PLN' }, paidAmount: { amount: status === 'PAID' ? 100 : 0, currency: 'PLN' }, outstandingAmount: { amount: status === 'PAID' ? 0 : 100, currency: 'PLN' }, status });
const issue = (severity: string, kind = 'NEEDS_ANSWER'): AccountingIssue => ({ id: 'i', code: 'X', severity, kind, title: 'Problem', message: 'Details', resolution: { type: 'NONE', options: [] } });

describe('accounting presentation', () => {
  it('maps explicit document directions and rejects unknown types', () => { expect(mapDirection('SALE')).toBe('SALE'); expect(mapDirection('PURCHASE')).toBe('PURCHASE'); expect(mapDirection('OTHER')).toBe('UNKNOWN'); });
  it('orders issue priority and maps month status from backend state', () => { expect(issuePriority(issue('ERROR'))).toBeLessThan(issuePriority(issue('WARNING'))); expect(statusForIssue(issue('ERROR'))).toBe('error'); expect(statusForMonth({ issues: [issue('WARNING')], nextAction: 'REVIEW', lifecycle: 'ISSUES' })).toBe('requires_action'); expect(statusForMonth({ issues: [], nextAction: 'NONE', lifecycle: 'READY' })).toBe('resolved'); });
  it('maps payment states without treating unknown as paid', () => { expect(statusForPayment(payment('PAID'))).toBe('resolved'); expect(statusForPayment(payment('OVERDUE'))).toBe('error'); expect(statusForPayment(payment('UNKNOWN'))).toBe('requires_action'); expect(paymentMatches(line({ paymentStatus: 'OVERDUE' }), 'OVERDUE')).toBe(true); expect(paymentMatches(line({ paymentStatus: 'UNKNOWN' }), 'UNPAID')).toBe(true); });
  it('supports multi-month date filtering and invoice search', () => { expect(dateMatches(line({ issueDate: '2026-08-16' }), 'PREVIOUS_MONTH', '2026-09')).toBe(true); expect(dateMatches(line({ issueDate: '2026-07-16' }), 'LAST_3_MONTHS', '2026-09')).toBe(true); expect(matchesInvoice(line({ nip: '1234567890' }), '1234567890')).toBe(true); });
});
