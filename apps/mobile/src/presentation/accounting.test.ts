import { describe, expect, it } from 'vitest';
import { areAllObligationsPaid, calculationsReady, dateMatches, homeInvoiceDirection, invoicePaymentMatches, invoiceReviewPresentation, isPaymentHistoryItem, isQuietIssue, isUpcomingPayment, issuePresentation, obligationStatusText, outstandingObligationsMoney, outstandingObligationsTotal, paymentStatusForDisplay, statusForIssue, statusForMonth, statusForPayment } from './accounting';

describe('canonical accounting presentation', () => {
  it('shows pending settlement only when calculations are ready', () => { expect(statusForMonth({ status: 'OPEN', completeness: { status: 'COMPLETE', blockingIssueCount: 0 }, calculations: [{ type: 'RYCZALT', status: 'CURRENT', amount: { amount: '10.00' } }], obligations: [{ title: 'RYCZALT' }], settlement: { fullySettled: false }, issues: [], allowedActions: [] })).toBe('settlement_pending'); expect(statusForMonth({ status: 'OPEN', completeness: { status: 'COMPLETE', blockingIssueCount: 0 }, calculations: [], obligations: [{ title: 'RYCZALT' }, { title: 'VAT' }, { title: 'ZUS' }], settlement: { fullySettled: false }, issues: [], allowedActions: [] })).toBe('calculations_pending'); });
  it('treats only known current calculation states and all obligation calculation types as ready for payment display', () => { expect(calculationsReady([])).toBe(false); expect(calculationsReady([{ type: 'RYCZALT', status: 'CURRENT' }, { type: 'VAT', status: 'CALCULATED' }, { type: 'ZUS', status: 'FROZEN' }], [{ title: 'RYCZALT' }, { title: 'VAT' }, { title: 'ZUS' }])).toBe(true); expect(calculationsReady([{ type: 'ZUS', status: 'CURRENT' }], [{ title: 'RYCZALT' }, { title: 'VAT' }, { title: 'ZUS' }])).toBe(false); expect(calculationsReady([{ type: 'RYCZALT', status: 'DIRTY' }])).toBe(false); expect(calculationsReady([{ type: 'RYCZALT', status: 'STALE' }])).toBe(false); expect(calculationsReady([{ type: 'RYCZALT', status: 'FUTURE_STATUS' }])).toBe(false); });
  it('allows stale historical rows when each payable type also has a ready result', () => {
    const types = ['RYCZALT', 'VAT', 'ZUS'];
    const calculations = types.flatMap((type) => [
      { type, status: 'STALE' },
      { type, status: 'CALCULATED' }
    ]);
    expect(calculationsReady(calculations, types.map((title) => ({ title })))).toBe(true);
  });
  it('keeps a type unready when it has only stale rows despite other ready calculations', () => {
    expect(calculationsReady([
      { type: 'RYCZALT', status: 'CALCULATED' },
      { type: 'VAT', status: 'STALE' },
      { type: 'ZUS', status: 'CALCULATED' }
    ], [{ title: 'RYCZALT' }, { title: 'VAT' }, { title: 'ZUS' }])).toBe(false);
  });
  it('shows settlement when each obligation has a calculated result despite stale history rows', () => {
    const types = ['RYCZALT', 'VAT', 'ZUS'];
    const calculations = types.flatMap((type) => [{ type, status: 'STALE', amount: { amount: null } }, { type, status: 'CALCULATED', amount: { amount: '1.00' } }]);
    expect(statusForMonth({
      status: 'OPEN',
      completeness: { status: 'COMPLETE', blockingIssueCount: 0 },
      calculations,
      obligations: types.map((title) => ({ title })),
      settlement: { fullySettled: false },
      issues: [],
      allowedActions: []
    })).toBe('settlement_pending');
  });
  it('keeps unknown issue kinds visible as attention', () => { expect(statusForIssue({ id: 'x', code: 'FUTURE', severity: 'WARNING', kind: 'FUTURE_KIND', title: null, message: null, sourceReference: null })).toBe('requires_action'); });
  it('filters only canonical invoice payment statuses without treating NOT_REQUIRED as paid or inventing overdue', () => {
    const base = { id: '1', title: 'Fuel', amount: { amount: '10.00', currency: 'PLN' }, direction: 'PURCHASE' as const, counterparty: 'Fuel', legalName: 'Fuel', alias: null, taxIdentifier: null, documentNumber: null, issueDate: '2026-09-01', currency: 'PLN', importStatus: 'IMPORTED', approvalStatus: 'APPROVED', approvalSource: 'COUNTERPARTY_RULE', paymentVerificationPolicy: 'REQUIRED', source: null, category: 'FUEL', sourceType: null };
    expect(invoicePaymentMatches({ ...base, paymentStatus: 'MATCHED' }, 'PAID')).toBe(true);
    expect(invoicePaymentMatches({ ...base, paymentStatus: 'MANUALLY_CONFIRMED' }, 'PAID')).toBe(true);
    expect(invoicePaymentMatches({ ...base, paymentStatus: 'PARTIALLY_MATCHED' }, 'UNPAID')).toBe(false);
    expect(invoicePaymentMatches({ ...base, paymentStatus: 'PARTIALLY_MATCHED' }, 'PARTIALLY_PAID')).toBe(true);
    expect(invoicePaymentMatches({ ...base, paymentStatus: 'UNMATCHED' }, 'UNPAID')).toBe(true);
    expect(invoicePaymentMatches({ ...base, paymentStatus: 'NOT_REQUIRED' }, 'NOT_REQUIRED')).toBe(true);
    expect(invoicePaymentMatches({ ...base, paymentStatus: 'NOT_REQUIRED' }, 'UNPAID')).toBe(false);
    expect(invoicePaymentMatches({ ...base, paymentStatus: 'NOT_REQUIRED' }, 'PAID')).toBe(false);
    expect(invoicePaymentMatches({ ...base, paymentStatus: 'OVERDUE' }, 'UNPAID')).toBe(false);
    expect(invoicePaymentMatches({ ...base, paymentStatus: 'FUTURE_STATUS' }, 'PAID')).toBe(false);
    expect(invoicePaymentMatches({ ...base, paymentStatus: null }, 'PAID')).toBe(false);
  });
  it('keeps open obligations out of payment history', () => { expect(isUpcomingPayment({ status: 'OPEN' })).toBe(true); expect(isUpcomingPayment({ status: 'PARTIALLY_PAID' })).toBe(true); expect(isPaymentHistoryItem({ status: 'OPEN' })).toBe(false); expect(isPaymentHistoryItem({ status: 'PAID' })).toBe(true); });
  it('only labels a non-empty obligation list paid when every obligation is settled', () => { expect(areAllObligationsPaid([])).toBe(false); expect(areAllObligationsPaid([{ status: 'PAID' }, { status: 'OVERPAID' }])).toBe(true); expect(areAllObligationsPaid([{ status: 'PAID' }, { status: 'PARTIALLY_PAID' }])).toBe(false); expect(areAllObligationsPaid([{ status: 'FUTURE_STATUS' }])).toBe(false); });
  it('sums only unpaid outstanding obligation balances exactly, excluding fully paid rows', () => {
    const obligation = (status: string, amount: string) => ({ id: status + amount, title: status, period: '2026-08', dueDate: null, amount: { amount }, paidAmount: { amount: '0' }, outstandingAmount: { amount }, status });
    expect(outstandingObligationsTotal([obligation('OPEN', '7044.0000'), obligation('PARTIALLY_PAID', '32.0000'), obligation('PAID', '10000.00')])).toBe('7076.0000');
    expect(outstandingObligationsTotal([obligation('OPEN', '0.01'), obligation('OPEN', '0.02')])).toBe('0.03');
    expect(outstandingObligationsTotal([obligation('OPEN', 'bad'), obligation('PAID', '20.00')])).toBe('0');
  });
  it('shares one exact total and currency across Home and Settlements without injecting a currency', () => {
    const make = (status: string, amount: string, currency: string | null) => ({ id: status + amount, title: status, period: '2026-08', dueDate: null, amount: { amount, currency }, paidAmount: { amount: '0', currency }, outstandingAmount: { amount, currency }, status });
    expect(outstandingObligationsMoney([make('OPEN', '100.00', 'PLN'), make('PARTIALLY_PAID', '32.00', 'PLN')])).toEqual({ amount: '132.00', currency: 'PLN' });
    expect(outstandingObligationsMoney([make('OPEN', '100.00', null)])).toEqual({ amount: null, currency: null });
  });
  it('does not add outstanding obligations denominated in different currencies', () => {
    const make = (id: string, amount: string, currency: string) => ({ id, title: 'VAT', period: '2026-08', dueDate: null, amount: { amount, currency }, paidAmount: { amount: '0', currency }, outstandingAmount: { amount, currency }, status: 'OPEN' });
    expect(outstandingObligationsMoney([make('eur', '100.00', 'EUR'), make('pln', '200.00', 'PLN')])).toEqual({ amount: null, currency: null });
  });
  it('keeps invoice review independent from period completeness and payment state', () => {
    expect(invoiceReviewPresentation([])).toBeNull();
    expect(invoiceReviewPresentation([{ approvalStatus: 'APPROVED' }, { approvalStatus: 'APPROVED' }])).toEqual({ labelKey: 'settlements.reviewComplete', state: 'success' });
    expect(invoiceReviewPresentation([{ approvalStatus: 'APPROVED' }, { approvalStatus: 'NEEDS_REVIEW' }])).toEqual({ labelKey: 'settlements.reviewNeeded', state: 'attention' });
    expect(invoiceReviewPresentation([{ approvalStatus: 'FUTURE' }])).toEqual({ labelKey: 'common.unknown', state: 'unknown' });
  });
  it('marks only genuinely past-due unpaid obligations overdue and does not invent missing due dates', () => {
    expect(paymentStatusForDisplay({ status: 'OPEN', dueDate: '2026-09-24' }, '2026-09-25')).toBe('OVERDUE');
    expect(paymentStatusForDisplay({ status: 'PARTIALLY_PAID', dueDate: '2026-09-24' }, '2026-09-25')).toBe('OVERDUE');
    expect(paymentStatusForDisplay({ status: 'OPEN', dueDate: null }, '2026-09-25')).toBe('OPEN');
    expect(paymentStatusForDisplay({ status: 'PAID', dueDate: '2026-01-01' }, '2026-09-25')).toBe('PAID');
    expect(paymentStatusForDisplay({ status: 'OPEN', dueDate: '2026-09-25' }, '2026-09-25')).toBe('OPEN');
  });
  it('preserves backend unpaid statuses when outstanding is zero and keeps the obligation actionable', () => {
    const zeroRemaining = (status: string, dueDate: string | null = null) => ({ id: status, title: 'ZUS', period: '2026-07', dueDate, amount: { amount: '0.04', currency: 'PLN' }, paidAmount: { amount: '0.00', currency: 'PLN' }, outstandingAmount: { amount: '0.00', currency: 'PLN' }, status });
    for (const status of ['OPEN', 'DUE', 'PARTIALLY_PAID']) {
      const obligation = zeroRemaining(status);
      expect(paymentStatusForDisplay(obligation, '2026-09-27')).toBe(status);
      expect(statusForPayment(obligation)).toBe('requires_action');
      expect(isUpcomingPayment(obligation)).toBe(true);
      expect(isPaymentHistoryItem(obligation)).toBe(false);
      expect(areAllObligationsPaid([obligation])).toBe(false);
      expect(outstandingObligationsMoney([obligation])).toEqual({ amount: '0.00', currency: 'PLN' });
    }
  });
  it('recognizes only authoritative paid and overpaid statuses as payment history', () => {
    expect(paymentStatusForDisplay({ status: 'PAID', outstandingAmount: { amount: '0.00' } })).toBe('PAID');
    expect(isPaymentHistoryItem({ status: 'PAID', outstandingAmount: { amount: '0.00' } })).toBe(true);
    expect(paymentStatusForDisplay({ status: 'OVERPAID', outstandingAmount: { amount: '-0.01' } })).toBe('OVERPAID');
    expect(isPaymentHistoryItem({ status: 'OVERPAID', outstandingAmount: { amount: '-0.01' } })).toBe(true);
    expect(areAllObligationsPaid([{ status: 'PAID' }, { status: 'OVERPAID' }])).toBe(true);
  });
  it('keeps overdue presentation for an OPEN obligation past its due date, even with zero outstanding', () => {
    const obligation = { id: 'overdue-zero', title: 'ZUS', period: '2026-07', dueDate: '2026-09-24', amount: { amount: '0.04', currency: 'PLN' }, paidAmount: { amount: '0.00', currency: 'PLN' }, outstandingAmount: { amount: '0.00', currency: 'PLN' }, status: 'OPEN' };
    expect(paymentStatusForDisplay(obligation, '2026-09-25')).toBe('OVERDUE');
    expect(statusForPayment(obligation)).toBe('error');
    expect(isUpcomingPayment(obligation)).toBe(true);
    expect(isPaymentHistoryItem(obligation)).toBe(false);
    expect(areAllObligationsPaid([obligation])).toBe(false);
  });
  it('keeps an obligation with inconsistent zero balance out of history and visible as outstanding', () => {
    const obligation = { id: 'zus', title: 'ZUS', period: '2026-07', dueDate: null, amount: { amount: '0.04', currency: 'PLN' }, paidAmount: { amount: '0.00', currency: 'PLN' }, outstandingAmount: { amount: '0.00', currency: 'PLN' }, status: 'OPEN' };
    expect(isUpcomingPayment(obligation)).toBe(true);
    expect(isPaymentHistoryItem(obligation)).toBe(false);
    expect(areAllObligationsPaid([obligation])).toBe(false);
    expect(statusForPayment(obligation)).toBe('requires_action');
    expect(outstandingObligationsMoney([obligation])).toEqual({ amount: '0.00', currency: 'PLN' });
  });
  it('does not treat unknown or missing balances as paid', () => {
    expect(paymentStatusForDisplay({ status: 'OPEN', dueDate: '2026-07-20', outstandingAmount: { amount: null } }, '2026-09-27')).toBe('OVERDUE');
    expect(paymentStatusForDisplay({ status: 'OPEN', dueDate: '2026-07-20', outstandingAmount: { amount: '0.01' } }, '2026-09-27')).toBe('OVERDUE');
  });
  it('keeps reconciliation review out of the complete overall health state', () => {
    const period = { status: 'OPEN', completeness: { status: 'COMPLETE', blockingIssueCount: 0 }, calculations: [{ type: 'ZUS', status: 'CURRENT', amount: { amount: '0.00' } }], obligations: [{ title: 'ZUS' }], settlement: { fullySettled: true }, issues: [], allowedActions: [] };
    expect(statusForMonth({ ...period, reconciliation: { state: 'healthy' } })).toBe('resolved');
    expect(statusForMonth({ ...period, reconciliation: { state: 'missing_evidence' } })).toBe('requires_action');
    expect(statusForMonth({ ...period, reconciliation: { state: 'mismatch' } })).toBe('requires_action');
  });
  it('shows the full partial obligation amount and only the remaining balance in its status', () => {
    expect(obligationStatusText({ id: 'vat', title: 'VAT', period: '2026-08', dueDate: null, amount: { amount: '2412.00', currency: 'PLN' }, paidAmount: { amount: '2380.00', currency: 'PLN' }, outstandingAmount: { amount: '32.00', currency: 'PLN' }, status: 'PARTIALLY_PAID' }, '2026-09-25')).toBe('Częściowo opłacone (32 pozostało)');
  });
  it('keeps invoice date filters scoped to the selected accounting month', () => {
    const sale = { id: 'invoice', title: 'Invoice', amount: { amount: '100.00' }, direction: 'SALE' as const, counterparty: 'Customer', legalName: 'Customer', alias: null, taxIdentifier: null, documentNumber: 'FV/1', issueDate: '2026-08-31', currency: 'PLN', importStatus: null, approvalStatus: 'APPROVED', approvalSource: null, paymentVerificationPolicy: 'REQUIRED', paymentStatus: 'UNMATCHED', source: null, category: 'EU_SERVICE', sourceType: 'KSEF' };
    expect(dateMatches(sale, 'SELECTED_MONTH', '2026-08')).toBe(true);
    expect(dateMatches(sale, 'SELECTED_MONTH', '2026-09')).toBe(false);
    expect(dateMatches(sale, 'PREVIOUS_MONTH', '2026-09')).toBe(true);
  });
  it('maps the home invoice groups to the existing filtered invoice directions', () => {
    expect(homeInvoiceDirection('income')).toBe('SALE');
    expect(homeInvoiceDirection('costs')).toBe('PURCHASE');
  });
  it('keeps settlement and waiting-for-calculation notices out of attention', () => { expect(isQuietIssue({ code: 'UNSETTLED_OBLIGATION', kind: 'SETTLEMENT', message: 'Payment outstanding' })).toBe(true); expect(isQuietIssue({ code: 'MISSING_CALCULATION', kind: 'BLOCKED', message: 'No calculation is available' })).toBe(true); });
  it('localizes the canonical dirty-calculation issue', () => { expect(issuePresentation({ id: 'calc', code: 'DIRTY_CALCULATION', severity: 'ERROR', kind: 'BLOCKED', title: 'Calculation needs refresh', message: 'The VAT calculation is not current', sourceReference: null })).toMatchObject({ title: 'Obliczenia wymagają odświeżenia', body: 'Przelicz dane dla tego okresu, aby zobaczyć aktualne kwoty.' }); });
});
