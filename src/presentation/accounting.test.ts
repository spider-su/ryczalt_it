import { describe, expect, it } from 'vitest';
import { dateMatches, homeDataState, homeStatusCopy, issuePresentation, issuePriority, matchesInvoice, paymentMatches, statusForIssue, statusForMonth, statusForPayment } from './accounting';
import { mapDirection, mapDocument } from '../api/mappers/accountingMapper';
import { formatCurrency } from '../i18n';
import { isRequiredInputActive, mapCostError, mapCostMutation, mapRecognizedCost, missingRequiredInput } from './costPresentation';
import { ApiError } from '../api/client';
import type { CandidateDto } from '../api/dto/accounting';
import type { AccountingIssue, AccountingLine, PaymentLine } from '../model/accounting';

const line = (overrides: Partial<AccountingLine> = {}): AccountingLine => ({ id: '1', title: 'Adobe', amount: { amount: '249', currency: 'PLN' }, issueDate: '2026-09-16', documentNumber: 'FV/1', direction: 'PURCHASE', ...overrides });
const payment = (status: string): PaymentLine => ({ id: status, title: 'VAT', dueDate: '2026-09-25', amount: { amount: '100', currency: 'PLN' }, paidAmount: { amount: status === 'PAID' ? '100' : '0', currency: 'PLN' }, outstandingAmount: { amount: status === 'PAID' ? '0' : '100', currency: 'PLN' }, status });
const issue = (severity: string, kind = 'NEEDS_ANSWER'): AccountingIssue => ({ id: 'i', code: 'X', severity, kind, title: 'Problem', message: 'Details', resolution: { type: 'NONE', options: [] } });

describe('accounting presentation', () => {
  const candidate = (overrides: Partial<CandidateDto> = {}): CandidateDto => ({ sourceReference: 'sha256:x', documentType: 'PURCHASE_INVOICE', issueDate: '2026-09-16', saleDate: '2026-09-16', dueDate: null, reference: 'FV/1', seller: 'Adobe', buyer: null, sellerNip: null, buyerNip: null, category: null, currency: 'PLN', netAmount: 100, vatAmount: 23, grossAmount: 123, note: null, status: 'RECOGNIZED', ...overrides });
  it('maps explicit document directions and rejects unknown types', () => { expect(mapDirection('SALE')).toBe('SALE'); expect(mapDirection('PURCHASE')).toBe('PURCHASE'); expect(mapDirection('OTHER')).toBe('UNKNOWN'); expect(mapDirection(null)).toBe('UNKNOWN'); });
  it('does not invent document currency or lifecycle state and formats missing money safely', () => { const mapped = mapDocument({ id: 9, type: 'PURCHASE_INVOICE', counterparty: null, documentNumber: null, issueDate: null, saleDate: null, category: null, source: null, amount: 0, currency: null, status: null, sourceType: null, sourceTypeLabel: null, categoryLabel: null, importStatus: null, reviewStatus: null, paymentStatus: 'UNKNOWN' }); expect(mapped.amount).toEqual({ amount: '0' }); expect(mapped.currency).toBeNull(); expect(mapped.state).toBe('unknown'); expect(formatCurrency(null)).toBe('Brak danych'); expect(formatCurrency('12.50', 'EUR')).toContain('12,50'); });
  it('keeps informational month state distinct from unknown', () => { expect(homeStatusCopy('informational')).toEqual({ title: 'home.informationalTitle', body: 'home.informationalBody' }); expect(homeStatusCopy('unknown')).toEqual({ title: 'home.unknownTitle', body: 'home.unknownBody' }); });
  it('keeps loading, API failure, and successful data distinct', () => { expect(homeDataState(null, false)).toBe('loading'); expect(homeDataState(null, true)).toBe('error'); expect(homeDataState(line(), false)).toBe('ready'); });
  it('uses issue kind as the primary attention semantic', () => { expect(issuePriority(issue('ERROR', 'BLOCKED'))).toBeLessThan(issuePriority(issue('WARNING'))); expect(statusForIssue(issue('ERROR', 'INFO'))).toBe('informational'); expect(statusForIssue(issue('ERROR', 'NEEDS_ANSWER'))).toBe('requires_action'); expect(statusForIssue(issue('INFO', 'SETUP'))).toBe('setup_required'); expect(statusForIssue(issue('WARNING', 'BLOCKED'))).toBe('error'); expect(statusForMonth({ issues: [issue('WARNING', 'SETUP')], nextAction: 'NONE', lifecycle: 'OPEN' })).toBe('requires_action'); expect(statusForMonth({ issues: [], nextAction: 'NONE', lifecycle: 'LOCKED' })).toBe('resolved'); expect(statusForMonth({ issues: [], nextAction: 'SYNCING', lifecycle: 'OPEN' })).toBe('processing'); expect(statusForMonth({ issues: [], nextAction: 'NEW_BACKEND_STATE', lifecycle: 'NEW_BACKEND_STATE' })).toBe('unknown'); });
  it('keeps unknown reconciliation-like issue values neutral', () => { const unknown = issue('NEW_SEVERITY', 'NEW_KIND'); expect(statusForIssue(unknown)).toBe('unknown'); expect(statusForMonth({ issues: [unknown], nextAction: 'NEW_ACTION', lifecycle: 'NEW_LIFECYCLE' })).toBe('unknown'); });
  it('localizes known technical issues and hides unsafe technical fallbacks', () => {
    const known = issue('BLOCKING', 'BLOCKED');
    known.code = 'UNSUPPORTED_VAT_RATE'; known.title = 'UNSUPPORTED VAT RATE'; known.message = 'UNSUPPORTED_VAT_RATE: ... (null)';
    expect(issuePresentation(known)).toMatchObject({ title: 'Stawka VAT wymaga sprawdzenia', body: 'Sprawdź dane dokumentu przed dalszym rozliczeniem.' });
    const unknown = issue('WARNING', 'NEW_KIND');
    unknown.code = 'FUTURE_TECHNICAL_CODE'; unknown.title = null; unknown.message = null;
    expect(issuePresentation(unknown)).toMatchObject({ status: 'unknown', title: 'Nie można określić szczegółów', body: 'Dostępne dane nie pozwalają opisać tego elementu.' });
  });
  it('exposes only supported issue resolution actions', () => {
    const supported = issue('INFO', 'SETUP'); supported.resolution = { type: 'SETUP', settingsPath: '/accounting', actionLabel: null, options: [] };
    expect(issuePresentation(supported).actionLabel).toBe('Sprawdź');
    expect(issuePresentation(issue('WARNING', 'NEEDS_ANSWER')).actionLabel).toBeUndefined();
  });
  it('maps documented payment states and keeps unknown states neutral', () => { expect(statusForPayment(payment('PAID'))).toBe('resolved'); expect(statusForPayment(payment('SETTLED'))).toBe('resolved'); expect(statusForPayment(payment('MATCHED'))).toBe('resolved'); expect(statusForPayment(payment('OVERDUE'))).toBe('error'); expect(statusForPayment(payment('NOT_PAID'))).toBe('requires_action'); expect(statusForPayment(payment('NOT_DUE'))).toBe('informational'); expect(statusForPayment(payment('UNKNOWN'))).toBe('unknown'); expect(paymentMatches(line({ paymentStatus: 'OVERDUE' }), 'OVERDUE')).toBe(true); expect(paymentMatches(line({ paymentStatus: 'UNKNOWN' }), 'UNPAID')).toBe(false); });
  it('supports multi-month date filtering and locale-neutral invoice search', () => { expect(dateMatches(line({ issueDate: '2026-08-16' }), 'PREVIOUS_MONTH', '2026-09')).toBe(true); expect(dateMatches(line({ issueDate: '2026-07-16' }), 'LAST_3_MONTHS', '2026-09')).toBe(true); expect(matchesInvoice(line({ nip: '1234567890' }), '1234567890')).toBe(true); expect(matchesInvoice(line({ counterparty: 'Łódź Usługi' }), 'łódź')).toBe(true); });
  it('keeps cost accounting decisions backend-owned', () => { const review = mapRecognizedCost(candidate({ requiredInputs: [{ field: 'vatTreatment', inputType: 'choice', label: 'Sposób rozliczenia VAT', required: true, options: [{ value: 'DOMESTIC_PURCHASE', label: 'Zakup krajowy', recommended: false }], dependsOn: null, dependsOnValues: [] }, { field: 'vatRate', inputType: 'decimal', label: 'Stawka VAT', required: false, options: [], dependsOn: 'vatTreatment', dependsOnValues: ['DOMESTIC_PURCHASE'] }] })); expect(review.state).toBe('requires_input'); expect(review.requiresVatDecision).toBe(true); expect(review.options.map((option) => option.value)).toEqual(['DOMESTIC_PURCHASE']); expect(mapRecognizedCost(candidate({ documentType: 'SALES_INVOICE' })).state).toBe('unsupported'); expect(mapRecognizedCost(candidate({ duplicate: true })).state).toBe('duplicate'); });
  it('preserves backend required-input semantics, including dependencies and unknown fields', () => {
    const inputs = [
      { field: 'vatTreatment', inputType: 'choice', label: 'VAT', required: true, options: [], dependsOn: null, dependsOnValues: [] },
      { field: 'vatRate', inputType: 'decimal', label: 'Rate', required: false, options: [], dependsOn: 'vatTreatment', dependsOnValues: ['DOMESTIC_PURCHASE'] },
      { field: 'futureField', inputType: 'NEW_INPUT_TYPE', label: 'Future field', required: true, options: [], dependsOn: null, dependsOnValues: [] }
    ];
    expect(isRequiredInputActive(inputs[1]!, { vatTreatment: null })).toBe(false);
    expect(isRequiredInputActive(inputs[1]!, { vatTreatment: 'DOMESTIC_PURCHASE' })).toBe(true);
    expect(missingRequiredInput(inputs, { vatTreatment: 'DOMESTIC_PURCHASE' })?.field).toBe('vatRate');
    expect(missingRequiredInput(inputs, { vatTreatment: 'DOMESTIC_PURCHASE', vatRate: '23' })?.field).toBe('futureField');
    expect(mapRecognizedCost(candidate({ requiredInputs: inputs })).requiredInputs[2]?.inputType).toBe('NEW_INPUT_TYPE');
  });
  it('does not manufacture localized fallback metadata for legacy recognition options', () => { const review = mapRecognizedCost(candidate({ requiredInputs: undefined, vatTreatmentOptions: [{ value: 'DOMESTIC_PURCHASE', label: 'Zakup krajowy', recommended: false }] })); expect(review.requiredInputs[0]?.field).toBe('vatTreatment'); expect(review.requiredInputs[0]?.label).toBe(''); });
  it('does not treat an unknown mutation status as success', () => { expect(mapCostMutation({ documentId: null, reference: 'FV/1', status: 'PROCESSING', ksefStatus: null, duplicate: false, existingDocumentId: null, message: null }).state).toBe('unknown'); });
  it('maps authoritative duplicate results and typed API failures', () => { expect(mapCostMutation({ documentId: 7, reference: 'FV/1', status: 'DUPLICATE', ksefStatus: null, duplicate: true, existingDocumentId: 7, message: null })).toEqual({ state: 'duplicate', existingDocumentId: 7 }); expect(mapCostError(new ApiError('x', 503, undefined, 'unavailable'))).toBe('unavailable'); expect(mapCostError(new ApiError('x', 422))).toBe('validation_required'); });
});
