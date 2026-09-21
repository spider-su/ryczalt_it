import { describe, expect, it } from 'vitest';
import { statusForIssue, statusForMonth, paymentMatches } from './accounting';

describe('canonical accounting presentation', () => {
  it('allows a complete but unpaid period', () => { expect(statusForMonth({ status: 'OPEN', completeness: { status: 'COMPLETE', blockingIssueCount: 0 }, issues: [], allowedActions: ['SETTLE'] })).toBe('resolved'); });
  it('keeps unknown issue kinds visible as attention', () => { expect(statusForIssue({ id: 'x', code: 'FUTURE', severity: 'WARNING', kind: 'FUTURE_KIND', title: null, message: null, sourceReference: null })).toBe('requires_action'); });
  it('does not conflate approval with payment filtering', () => { const invoice = { id: '1', title: 'Fuel', amount: { amount: '10.00', currency: 'PLN' }, direction: 'PURCHASE' as const, counterparty: 'Fuel', legalName: 'Fuel', alias: null, taxIdentifier: null, documentNumber: null, issueDate: '2026-09-01', currency: 'PLN', importStatus: 'IMPORTED', approvalStatus: 'APPROVED', approvalSource: 'COUNTERPARTY_RULE', paymentVerificationPolicy: 'NOT_REQUIRED', paymentStatus: 'NOT_REQUIRED', source: null, category: 'FUEL', sourceType: null }; expect(paymentMatches(invoice, 'PAID')).toBe(false); expect(paymentMatches({ ...invoice, paymentStatus: 'MATCHED' }, 'PAID')).toBe(true); });
});
