import { describe, expect, it } from 'vitest';
import { accountingPaths } from './accountingPaths';

describe('canonical accounting API paths', () => {
  it('uses the unversioned accounting root for every accounting resource', () => {
    expect(accountingPaths.period(7, '2026-09')).toBe('/api/profiles/7/accounting/periods/2026-09');
    expect(accountingPaths.invoices(7, '2026-09')).toBe('/api/profiles/7/accounting/periods/2026-09/invoices');
    expect(accountingPaths.payments(7)).toBe('/api/profiles/7/accounting/payments');
    expect(accountingPaths.counterpartyInvoices(7, 3)).toBe('/api/profiles/7/accounting/invoices?counterpartyId=3');
    expect(accountingPaths.manualPaid(7, 42)).toBe('/api/profiles/7/accounting/invoices/42/manual-paid');
    expect(accountingPaths.recognizeInvoice(7)).toBe('/api/profiles/7/accounting/invoices/recognize');
  });
  it('exposes period commands and counterparty rules without legacy aliases', () => {
    expect(accountingPaths.settle(7, '2026-09')).toBe('/api/profiles/7/accounting/periods/2026-09/settle');
    expect(accountingPaths.rule(7, '3', '11')).toBe('/api/profiles/7/accounting/counterparties/3/rules/11');
  });
});
