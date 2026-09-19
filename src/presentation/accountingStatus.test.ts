import { describe, expect, it } from 'vitest';
import { bankStatusView, documentProcessingView, documentReviewView, filingStatusView, jpkStatusView, ksefStatusView, reconciliationStatusView, upoStatusView } from './accountingStatus';

describe('accounting status presentation', () => {
  it('keeps unknown KSeF state neutral', () => {
    expect(ksefStatusView('NEW_STATUS').state).toBe('unknown');
    expect(ksefStatusView('CONNECTED').state).toBe('success');
    expect(ksefStatusView('NOT_CONFIGURED').state).not.toBe('success');
  });

  it('does not infer bank connectivity from zero transactions', () => {
    expect(bankStatusView({ transactionCount: 0, unmatchedCount: 0, importStatus: 'NO_IMPORT', state: 'unavailable' }).state).toBe('pending');
    expect(bankStatusView({ transactionCount: 0, unmatchedCount: 0, importStatus: 'NEW', state: 'unknown' }).state).toBe('unknown');
  });

  it('preserves filing and artifact states', () => {
    expect(filingStatusView({ lifecycle: 'OPEN', lifecycleLabel: 'Open', ready: false, issues: [], jpkStatus: 'MISSING', jpkGeneratedAt: null, upoStatus: 'MISSING', upoReference: null, upoReceivedAt: null }).state).toBe('pending');
    expect(filingStatusView({ lifecycle: 'ISSUES', lifecycleLabel: 'Issues', ready: false, issues: ['MISSING'], jpkStatus: 'INVALID', jpkGeneratedAt: null, upoStatus: 'REJECTED', upoReference: null, upoReceivedAt: null }).state).toBe('attention');
    expect(jpkStatusView('SUBMITTED').state).toBe('success');
    expect(jpkStatusView('NEW').state).toBe('unknown');
    expect(upoStatusView('ACCEPTED').state).toBe('success');
    expect(upoStatusView('NEW').state).toBe('unknown');
  });

  it('keeps reconciliation mismatch and missing evidence distinct', () => {
    expect(reconciliationStatusView({ rowCount: 2, settledCount: 1, mismatchCount: 1, missingEvidenceCount: 0, state: 'mismatch' }).state).toBe('attention');
    expect(reconciliationStatusView({ rowCount: 2, settledCount: 1, mismatchCount: 0, missingEvidenceCount: 1, state: 'missing_evidence' }).state).toBe('attention');
    expect(reconciliationStatusView({ rowCount: null, settledCount: null, mismatchCount: null, missingEvidenceCount: null, state: 'unknown' }).state).toBe('unknown');
  });

  it('keeps healthy reconciliation scoped to data reconciliation', () => {
    expect(reconciliationStatusView({ rowCount: 2, settledCount: 2, mismatchCount: 0, missingEvidenceCount: 0, state: 'healthy' })).toEqual({ state: 'success', labelKey: 'status.reconciliationHealthy' });
  });

  it('keeps document processing and review dimensions independent', () => {
    expect(documentProcessingView('IMPORTED').state).toBe('success');
    expect(documentProcessingView('FAILED').state).toBe('error');
    expect(documentProcessingView('NEW').state).toBe('unknown');
    expect(documentReviewView('REVIEW_REQUIRED').state).toBe('attention');
    expect(documentReviewView(null).state).toBe('unknown');
  });
});
