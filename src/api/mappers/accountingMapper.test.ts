import { describe, expect, it } from 'vitest';
import { mapAccountingMonth, mapDocument, mapPaymentHistory } from './accountingMapper';
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
    expect(mapDocument(document({ status: 'IMPORTED' })).state).toBe('ok');
    expect(mapDocument(document({ status: 'FAILED' })).state).toBe('attention');
    expect(mapDocument(document({ reviewStatus: 'REVIEW_REQUIRED' })).state).toBe('attention');
    expect(mapDocument(document({ status: 'NEW_BACKEND_STATE' })).state).toBe('unknown');
    const payment: PaymentHistoryDto = { type: 'VAT', period: '2026-09', amount: null, paidAmount: null, outstandingAmount: null, dueDate: null, paymentDate: null, status: 'NEW_BACKEND_STATE' };
    expect(mapPaymentHistory([payment])[0]).toMatchObject({ status: 'NEW_BACKEND_STATE', amount: { amount: null, currency: 'PLN' }, dueDate: null });
  });

  it('keeps empty documents distinct and rejects invalid accounting months', () => {
    expect(mapAccountingMonth(overview(), [])).toMatchObject({ income: [], costs: [], payments: [], attentionCount: 0 });
    expect(() => mapAccountingMonth(overview({ month: '2026-13' }), [])).toThrow('invalid month');
  });

  it('preserves unknown issue state for the attention layer', () => {
    const unknownIssue = {
      id: 'issue-1', code: 'NEW', severity: 'NEW_SEVERITY', kind: 'NEW_KIND', title: 'Unknown', message: 'Unknown',
      sourceReference: null, resolution: { type: 'NONE', command: null, options: [], settingsPath: null, actionLabel: null, reason: null }
    };
    const mapped = mapAccountingMonth(overview({ issues: [unknownIssue] }), []);
    expect(mapped.issues[0]?.kind).toBe('NEW_KIND');
  });
});
