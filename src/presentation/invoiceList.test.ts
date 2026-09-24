import { describe, expect, it } from 'vitest';
import type { Invoice } from '../model/accounting';
import { groupInvoicesByMonth, invoiceApprovalPresentation, invoiceCounterpartyLabel, invoiceSourcePresentation, receivedInvoiceGroups } from './invoiceList';

function invoice(id: string, issueDate: string | null): Invoice {
  return {
    id, title: `Invoice ${id}`, amount: { amount: '10.00', currency: 'PLN' }, direction: 'PURCHASE',
    counterparty: 'Adobe', legalName: 'Adobe', alias: null, taxIdentifier: null,
    documentNumber: `FV/${id}`, issueDate, currency: 'PLN', importStatus: null,
    approvalStatus: null, approvalSource: null, paymentVerificationPolicy: null, paymentStatus: null,
    source: null, category: null, sourceType: null
  };
}

describe('invoice list presentation', () => {
  it('groups date-only invoice dates by month, newest first, preserving order within groups and across years', () => {
    const groups = groupInvoicesByMonth([
      invoice('mar-15', '2026-03-15'), invoice('mar-01', '2026-03-01'),
      invoice('feb-20', '2026-02-20'), invoice('jan', '2026-01-30'),
      invoice('dec', '2025-12-31')
    ]);
    expect(groups.map((group) => group.month)).toEqual(['2026-03', '2026-02', '2026-01', '2025-12']);
    expect(groups[0]?.invoices.map((item) => item.id)).toEqual(['mar-15', 'mar-01']);
  });

  it('separates received income invoices from cost bills and prefers aliases for display', () => {
    const sale = { ...invoice('sale', '2026-03-01'), direction: 'SALE' as const, alias: 'Company alias', legalName: 'Company legal name' };
    const purchase = { ...invoice('purchase', '2026-03-02'), alias: null, legalName: 'Seller legal name' };
    const unknown = { ...invoice('unknown', null), direction: 'UNKNOWN' as const };
    const groups = receivedInvoiceGroups([sale, purchase, unknown]);
    expect(groups.income.map((item) => item.id)).toEqual(['sale']);
    expect(groups.costs.map((item) => item.id)).toEqual(['purchase']);
    expect(invoiceCounterpartyLabel(sale)).toBe('Company alias');
    expect(invoiceCounterpartyLabel(purchase)).toBe('Seller legal name');
  });

  it('uses documented approval values, treats unknown values neutrally, and only marks counterparty-rule approval automatic', () => {
    expect(invoiceApprovalPresentation('APPROVED', 'COUNTERPARTY_RULE')).toEqual({ label: 'approved', tone: 'success', automatic: true });
    expect(invoiceApprovalPresentation('APPROVED', 'KSEF_TRUSTED')).toEqual({ label: 'approved', tone: 'success', automatic: true });
    expect(invoiceApprovalPresentation('APPROVED', 'MANUAL')?.automatic).toBe(false);
    expect(invoiceApprovalPresentation('APPROVED', 'MIGRATION')?.automatic).toBe(false);
    expect(invoiceApprovalPresentation('NEEDS_REVIEW', 'COUNTERPARTY_RULE')).toEqual({ label: 'needsReview', tone: 'warning', automatic: false });
    expect(invoiceApprovalPresentation('FUTURE_STATUS', 'FUTURE_METHOD')).toEqual({ label: 'unknown', tone: 'muted', automatic: false });
    expect(invoiceApprovalPresentation(null, null)).toBeNull();
  });

  it('does not create an approval badge from payment state alone', () => {
    const paidOnly = { ...invoice('paid-only', '2026-03-01'), paymentStatus: 'PAID' };
    expect(invoiceApprovalPresentation(paidOnly.approvalStatus, paidOnly.approvalSource)).toBeNull();
  });

  it('uses the KSeF treatment only when the source type explicitly identifies KSeF', () => {
    expect(invoiceSourcePresentation({ sourceType: 'KSEF', sourceReference: 'K-123', documentNumber: 'FV/123', issueDate: '2026-03-15' })).toEqual({ kind: 'ksef', reference: 'K-123', date: '2026-03-15' });
    expect(invoiceSourcePresentation({ sourceType: 'ksef', source: 'K-456', documentNumber: 'FV/456', issueDate: '2026-03-16' }).reference).toBe('K-456');
    expect(invoiceSourcePresentation({ sourceType: null, documentNumber: 'KSEF/2026/123', issueDate: '2026-03-15' })).toEqual({ kind: 'document', reference: 'KSEF/2026/123', date: '2026-03-15' });
    expect(invoiceSourcePresentation({ sourceType: 'OTHER', documentNumber: 'FV/123', issueDate: null }).kind).toBe('document');
  });
});
