import { describe, expect, it } from 'vitest';
import { mapAccountingMonth, mapBankSummary, mapDocument, mapPaymentHistory, mapReconciliationSummary, normalizePaymentStatus } from './accountingMapper';
import type { AccountingDocumentDto, AccountingMonthOverviewDto, PaymentHistoryDto } from '../dto/accounting';

const overview = (overrides: Partial<AccountingMonthOverviewDto> = {}): AccountingMonthOverviewDto => ({
  month: '2026-09', lifecycle: 'OPEN', lifecycleLabel: 'Open', nextAction: 'NONE', nextActionLabel: 'None',
  summary: { revenue: '0.00', vat: '0.00', ryczalt: '0.00', zus: '0.00', documents: 0, bankTransactions: 0, totalObligations: '0.00' },
  issues: [], sources: { evidenceCount: 0, imported: 0, reviewRequired: 0, failed: 0 }, ksefStatus: 'NOT_CONNECTED',
  documentSummary: { salesCount: 0, purchaseCount: 0, totalCount: 0, reviewRequired: 0, failed: 0 },
  bankSummary: { transactionCount: 0, unmatchedCount: 0, importStatus: 'NONE' },
  paymentSummary: { expectedCount: 0, outstandingCount: 0, totalOutstanding: '0.00', payments: [] },
  filingSummary: { lifecycle: 'NONE', lifecycleLabel: 'None', ready: false, issues: [], jpkStatus: 'NONE', jpkGeneratedAt: null, upoStatus: 'NONE', upoReference: null, upoReceivedAt: null },
  reconciliationSummary: { rowCount: 0, settledCount: 0, mismatchCount: 0, missingEvidenceCount: 0 }, allowedActions: [],
  ...overrides
});

const document = (overrides: Partial<AccountingDocumentDto> = {}): AccountingDocumentDto => ({
  id: 1, type: 'PURCHASE', counterparty: 'Supplier', documentNumber: 'FV/1', issueDate: '2026-09-01', saleDate: null,
  category: null, source: null, amount: '1234567.89', currency: 'PLN', status: 'IMPORTED', sourceType: null,
  sourceTypeLabel: null, categoryLabel: null, importStatus: null, reviewStatus: null, paymentStatus: null, ...overrides
});

describe('accounting response mappers', () => {
  it('preserves exact money strings and currency, including large values and zero', () => {
    const result = mapDocument(document()).amount;
    expect(result).toEqual({ amount: '1234567.89', currency: 'PLN' });
    expect(mapDocument(document({ amount: '0.00' })).amount).toEqual({ amount: '0.00', currency: 'PLN' });
    expect(mapDocument(document({ amount: null as never })).amount).toEqual({ amount: null, currency: 'PLN' });
  });

  it('keeps unknown document and payment statuses unknown/raw', () => {
    expect(mapDocument(document({ status: 'IMPORTED' })).state).toBe('unknown');
    expect(mapDocument(document({ importStatus: 'IMPORTED' })).state).toBe('ok');
    expect(mapDocument(document({ importStatus: 'FAILED' })).state).toBe('attention');
    expect(mapDocument(document({ reviewStatus: 'REVIEW_REQUIRED' })).state).toBe('attention');
    expect(mapDocument(document({ status: 'NEW_BACKEND_STATE' })).state).toBe('unknown');
    const payment: PaymentHistoryDto = { type: 'VAT', period: '2026-09', amount: null, paidAmount: null, outstandingAmount: null, dueDate: null, paymentDate: null, status: 'NEW_BACKEND_STATE' };
    expect(mapPaymentHistory([payment])[0]).toMatchObject({ status: 'NEW_BACKEND_STATE', amount: { amount: null, currency: 'PLN' }, dueDate: null });
  });

  it('normalizes missing current-payment status at the mapper boundary', () => {
    expect(normalizePaymentStatus(null)).toBe('UNKNOWN');
    expect(normalizePaymentStatus('')).toBe('UNKNOWN');
    expect(normalizePaymentStatus('   ')).toBe('UNKNOWN');
    expect(normalizePaymentStatus('UNKNOWN')).toBe('UNKNOWN');
    expect(normalizePaymentStatus('NEW_BACKEND_STATE')).toBe('NEW_BACKEND_STATE');
    const mapped = mapAccountingMonth(overview({ paymentSummary: { ...overview().paymentSummary, payments: [{ obligationType: 'VAT', amount: '100', paidAmount: '0', outstandingAmount: '100', dueDate: null, status: null }] } }), []);
    expect(mapped.payments[0]?.status).toBe('UNKNOWN');
  });

  it('keeps document processing dimensions separate and preserves corrections', () => {
    const mapped = mapDocument(document({ sourceType: 'KSEF', sourceTypeLabel: 'KSeF', importStatus: 'IMPORTED', reviewStatus: 'REVIEW_REQUIRED', paymentStatus: 'PAID', documentKind: 'CORRECTION', correctsDocumentId: 7, correctsDocumentReference: 'FV/7', status: 'LEGACY_UNKNOWN' }));
    expect(mapped.state).toBe('attention');
    expect(mapped.ksefStatus).toBe('IMPORTED');
    expect(mapped.importStatus).toBe('IMPORTED');
    expect(mapped.paymentStatus).toBe('PAID');
    expect(mapped.documentKind).toBe('CORRECTION');
    expect(mapped.correctsDocumentId).toBe('7');
    expect(mapped.correctsDocumentReference).toBe('FV/7');
  });

  it('maps reconciliation and bank states without treating zero as disconnected or healthy by default', () => {
    expect(mapReconciliationSummary({ rowCount: 4, settledCount: 4, mismatchCount: 0, missingEvidenceCount: 0 }).state).toBe('healthy');
    expect(mapReconciliationSummary({ rowCount: 4, settledCount: 2, mismatchCount: 2, missingEvidenceCount: 0 }).state).toBe('mismatch');
    expect(mapReconciliationSummary({ rowCount: 4, settledCount: 3, mismatchCount: 0, missingEvidenceCount: 1 }).state).toBe('missing_evidence');
    expect(mapReconciliationSummary({ rowCount: null as never, settledCount: 0, mismatchCount: 0, missingEvidenceCount: 0 }).state).toBe('unknown');
    expect(mapBankSummary({ transactionCount: 0, unmatchedCount: 0, importStatus: 'NO_IMPORT' }).state).toBe('unavailable');
    expect(mapBankSummary({ transactionCount: 3, unmatchedCount: 0, importStatus: 'IMPORTED' }).state).toBe('matched');
    expect(mapBankSummary({ transactionCount: 3, unmatchedCount: 1, importStatus: 'IMPORTED' }).state).toBe('unmatched');
    expect(mapBankSummary({ transactionCount: 3, unmatchedCount: 0, importStatus: 'NEW_BACKEND_STATE' }).state).toBe('unknown');
  });

  it('keeps empty documents distinct and rejects invalid accounting months', () => {
    expect(mapAccountingMonth(overview(), [])).toMatchObject({ income: [], costs: [], payments: [], attentionCount: 0 });
    expect(() => mapAccountingMonth(overview({ month: '2026-13' }), [])).toThrow('invalid month');
  });

  it('keeps tax summary values separate from outstanding payment value', () => {
    const mapped = mapAccountingMonth(overview({ summary: { ...overview().summary, ryczalt: '7340', vat: '6612', zus: '1495.04' }, paymentSummary: { ...overview().paymentSummary, totalOutstanding: '0.00', payments: [] } }), []);
    expect(mapped.taxes).toMatchObject({ ryczalt: { amount: '7340' }, vat: { amount: '6612' }, zus: { amount: '1495.04' } });
    expect(mapped.totalToPay).toEqual({ amount: '0.00', currency: 'PLN' });
    expect(mapped.payments).toEqual([]);
  });

  it('preserves unknown issue state for the attention layer', () => {
    const unknownIssue = {
      id: 'issue-1', code: 'NEW', severity: 'NEW_SEVERITY', kind: 'NEW_KIND', title: 'Unknown', message: 'Unknown',
      sourceReference: null, resolution: { type: 'NONE', command: null, options: [], settingsPath: null, actionLabel: null, reason: null }
    };
    const mapped = mapAccountingMonth(overview({ issues: [unknownIssue] }), []);
    expect(mapped.issues[0]?.kind).toBe('NEW_KIND');
    expect(mapped.attentionCount).toBe(0);
    expect(mapped.matchStatus).toBe('MATCH');
  });

  it('normalizes incomplete issue payloads to safe unknown display state', () => {
    const malformed = { id: 'issue-malformed', code: null, severity: null, kind: null, title: null, message: null, resolution: null } as never;
    const mapped = mapAccountingMonth(overview({ issues: [malformed] }), []);
    expect(mapped.issues[0]).toMatchObject({ code: 'UNKNOWN_ISSUE', severity: 'UNKNOWN', kind: 'UNKNOWN', resolution: { type: 'NONE', options: [] } });
    expect(mapped.attentionCount).toBe(0);
  });

  it('counts only contract-defined actionable issue states', () => {
    const warning = {
      id: 'issue-1', code: 'REVIEW', severity: 'WARNING', kind: 'REVIEW', title: 'Review', message: 'Review',
      sourceReference: null, resolution: { type: 'NONE', command: null, options: [], settingsPath: null, actionLabel: null, reason: null }
    };
    const informational = { ...warning, id: 'issue-2', severity: 'INFO', kind: 'INFO' };
    const mapped = mapAccountingMonth(overview({ issues: [warning, informational] }), []);
    expect(mapped.attentionCount).toBe(1);
    expect(mapped.matchStatus).toBe('WARNING');
  });
});
