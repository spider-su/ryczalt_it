import { describe, expect, it } from 'vitest';
import { accountingPaths } from './accountingPaths';

describe('accounting API paths', () => {
  it('uses the verified mobile overview and document routes', () => {
    expect(accountingPaths.mobileMonth(1, '2026-09')).toBe('/api/v1/profiles/1/accounting/months/2026-09');
    expect(accountingPaths.mobileDocuments(1, '2026-09')).toBe('/api/v1/profiles/1/accounting/months/2026-09/documents');
  });

  it('uses the unversioned mutation and history controller routes', () => {
    expect(accountingPaths.recognizeDocument(1)).toBe('/api/profiles/1/accounting/documents/recognize');
    expect(accountingPaths.documents(1)).toBe('/api/profiles/1/accounting/documents');
    expect(accountingPaths.paymentHistory(1)).toBe('/api/v1/profiles/1/accounting/payments/history');
  });
});
