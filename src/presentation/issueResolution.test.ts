import { describe, expect, it } from 'vitest';
import { resolveIssueAction } from './issueResolution';

describe('canonical issue presentation', () => {
  it('only navigates when a concrete invoice reference matches', () => { const invoice = { id: '1', title: 'Supplier', amount: { amount: '10.00', currency: 'PLN' }, direction: 'PURCHASE' as const, counterparty: 'Supplier', legalName: 'Supplier', alias: null, taxIdentifier: null, documentNumber: null, issueDate: null, currency: 'PLN', importStatus: null, approvalStatus: 'NEEDS_REVIEW', approvalSource: null, paymentVerificationPolicy: 'REQUIRED', paymentStatus: 'UNMATCHED', source: 'source-1', category: null, sourceType: null }; const issue = { id: 'i', code: 'REVIEW', severity: 'WARNING', kind: 'NEEDS_ANSWER', title: null, message: null, sourceReference: 'source-1' }; expect(resolveIssueAction(issue, [invoice]).kind).toBe('SUPPORTED_NAVIGATION'); expect(resolveIssueAction({ ...issue, sourceReference: 'missing' }, [invoice]).kind).toBe('UNKNOWN'); });
});
