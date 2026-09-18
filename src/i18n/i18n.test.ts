import { afterEach, describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatMonth, paymentStatusKey, paymentStatusLabel, setActiveLocale, t, translationsByLocale } from './index';
import { persistLocale, resolveInitialLocale } from './LocaleContext';
import { mapRecognizedCost, reviewedDocumentFromCandidate } from '../presentation/costPresentation';
import type { CandidateDto } from '../api/dto/accounting';
import { mapDirection } from '../api/mappers/accountingMapper';

function translationShape(value: unknown, prefix = ''): Record<string, 'string' | 'object'> {
  if (typeof value === 'string') return { [prefix]: 'string' };
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, 'string' | 'object'>>((shape, [key, child]) => ({ ...shape, ...translationShape(child, prefix ? `${prefix}.${key}` : key) }), { [prefix]: 'object' });
}
afterEach(() => setActiveLocale('pl'));
describe('localized presentation', () => {
  it('keeps PL and EN dictionaries recursively identical, including leaf types', () => { expect(translationShape(translationsByLocale.pl)).toEqual(translationShape(translationsByLocale.en)); });
  it('uses saved locale, then supported device locale, then Polish fallback', () => { expect(resolveInitialLocale('en', 'pl-PL')).toBe('en'); expect(resolveInitialLocale(null, 'en-US')).toBe('en'); expect(resolveInitialLocale(null, 'de-DE')).toBe('pl'); });
  it('retains the previous locale when persistence fails', async () => { expect(await persistLocale('en', async () => { throw new Error('storage unavailable'); })).toBe(false); });
  it('formats the same canonical date, month, money and currency for each UI locale', () => {
    setActiveLocale('pl'); const pl = { date: formatDate('2026-09-18'), month: formatMonth('2026-09'), money: formatCurrency('1234.56', 'PLN') };
    setActiveLocale('en'); const en = { date: formatDate('2026-09-18'), month: formatMonth('2026-09'), money: formatCurrency('1234.56', 'PLN') };
    expect(pl.date).toContain('wrz'); expect(en.date).toContain('Sep'); expect(pl.month).toContain('wrzes'); expect(en.month).toContain('September'); expect(pl.money).not.toBe(en.money);
    expect({ amount: '1234.56', currency: 'PLN' }).toEqual({ amount: '1234.56', currency: 'PLN' });
    setActiveLocale('pl'); expect(formatMonth('')).toBe('Brak danych'); expect(formatMonth(null)).toBe('Brak danych'); expect(formatMonth(undefined)).toBe('Brak danych'); expect(formatMonth('2026-13')).toBe('Brak danych'); expect(formatMonth('2026-02-30')).toBe('Brak danych');
    setActiveLocale('en'); expect(formatMonth('')).toBe('No data'); expect(formatMonth('not-a-month')).toBe('No data');
    expect(paymentStatusKey('OVERDUE')).toBe('overdue'); setActiveLocale('pl'); expect(paymentStatusLabel('OVERDUE')).toBe('Po terminie'); setActiveLocale('en'); expect(paymentStatusLabel('OVERDUE')).toBe('Overdue'); expect(t('payments.status.unknown')).toBe('No data');
  });
  it('keeps Add Cost recognition semantics independent from UI locale', () => {
    const candidate: CandidateDto = { sourceReference: 'sha256:x', documentType: 'PURCHASE_INVOICE', issueDate: '2026-09-16', saleDate: '2026-09-16', dueDate: null, reference: 'FV/1', seller: 'Adobe', buyer: null, sellerNip: '1234567890', buyerNip: null, category: 'SERVICE', currency: 'PLN', netAmount: '100.00', vatAmount: '23.00', grossAmount: '123.00', note: 'note', status: 'RECOGNIZED', vatTreatment: 'DOMESTIC_PURCHASE', vatRate: '23', requiredInputs: [{ field: 'vatTreatment', inputType: 'choice', label: 'VAT', required: true, options: [], dependsOn: null, dependsOnValues: [] }, { field: 'vatRate', inputType: 'decimal', label: 'VAT rate', required: true, options: [], dependsOn: 'vatTreatment', dependsOnValues: ['DOMESTIC_PURCHASE'] }, { field: 'counterpartyCountry', inputType: 'text', label: 'Country', required: true, options: [], dependsOn: null, dependsOnValues: [] }] };
    setActiveLocale('pl'); const pl = mapRecognizedCost(candidate);
    setActiveLocale('en'); const en = mapRecognizedCost(candidate);
    const values = { vatTreatment: 'DOMESTIC_PURCHASE', vatRate: '23,00', counterpartyCountry: 'PL' };
    const plPayload = reviewedDocumentFromCandidate(candidate, values, candidate.requiredInputs ?? []);
    const enPayload = reviewedDocumentFromCandidate(candidate, values, candidate.requiredInputs ?? []);
    expect(en.candidate).toEqual(pl.candidate); expect(en.state).toBe(pl.state); expect(en.amount).toBe(pl.amount); expect(en.currency).toBe('PLN'); expect(enPayload).toEqual(plPayload); expect(enPayload).toMatchObject({ issueDate: '2026-09-16', documentType: 'PURCHASE_INVOICE', counterpartyTaxIdentifier: '1234567890', counterpartyCountry: 'PL', currency: 'PLN', netAmount: '100.00', vatAmount: '23.00', grossAmount: '123.00', vatTreatment: 'DOMESTIC_PURCHASE', vatRate: '23.00', taxPeriod: null });
    const canonical = { accountingMonthId: '2026-09', documentDirection: mapDirection(candidate.documentType), paymentFilter: 'OVERDUE', paymentStatus: paymentStatusKey('OVERDUE'), vatTreatment: candidate.vatTreatment, vatRate: candidate.vatRate, countryCode: 'PL', taxPeriod: null, money: { amount: candidate.grossAmount, currency: candidate.currency }, duplicate: pl.state === 'duplicate' };
    setActiveLocale('pl'); const plCanonical = { ...canonical, label: t('common.overdue') };
    setActiveLocale('en'); const enCanonical = { ...canonical, label: t('common.overdue') };
    expect(enCanonical).toMatchObject({ ...plCanonical, label: 'Overdue' }); expect(enCanonical).toEqual({ ...plCanonical, label: 'Overdue' });
  });
});
