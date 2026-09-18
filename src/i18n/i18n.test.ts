import { afterEach, describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatMonth, paymentStatusKey, paymentStatusLabel, setActiveLocale, t, translationsByLocale } from './index';
import { resolveInitialLocale } from './LocaleContext';
import { mapRecognizedCost } from '../presentation/costPresentation';
import type { CandidateDto } from '../api/dto/accounting';

function leafPaths(value: unknown, prefix = ''): string[] { if (typeof value === 'string') return [prefix]; return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key)); }
afterEach(() => setActiveLocale('pl'));
describe('localized presentation', () => {
  it('keeps PL and EN dictionaries structurally identical', () => { expect(leafPaths(translationsByLocale.pl).sort()).toEqual(leafPaths(translationsByLocale.en).sort()); });
  it('uses saved locale, then supported device locale, then Polish fallback', () => { expect(resolveInitialLocale('en', 'pl-PL')).toBe('en'); expect(resolveInitialLocale(null, 'en-US')).toBe('en'); expect(resolveInitialLocale(null, 'de-DE')).toBe('pl'); });
  it('formats the same canonical money and dates for each UI locale', () => {
    setActiveLocale('pl'); const pl = { date: formatDate('2026-09-18'), month: formatMonth('2026-09'), money: formatCurrency('1234.56', 'PLN') };
    setActiveLocale('en'); const en = { date: formatDate('2026-09-18'), month: formatMonth('2026-09'), money: formatCurrency('1234.56', 'PLN') };
    expect(pl.date).toContain('wrz'); expect(en.date).toContain('Sep'); expect(pl.month).toContain('wrzes'); expect(en.month).toContain('September'); expect(pl.money).not.toBe(en.money);
    expect(paymentStatusKey('OVERDUE')).toBe('overdue'); setActiveLocale('pl'); expect(paymentStatusLabel('OVERDUE')).toBe('Po terminie'); setActiveLocale('en'); expect(paymentStatusLabel('OVERDUE')).toBe('Overdue'); expect(t('payments.status.unknown')).toBe('No data');
  });
  it('keeps Add Cost recognition semantics independent from UI locale', () => {
    const candidate: CandidateDto = { sourceReference: 'sha256:x', documentType: 'PURCHASE_INVOICE', issueDate: '2026-09-16', saleDate: '2026-09-16', dueDate: null, reference: 'FV/1', seller: 'Adobe', buyer: null, sellerNip: null, buyerNip: null, category: 'SERVICE', currency: 'PLN', netAmount: '100.00', vatAmount: '23.00', grossAmount: '123.00', note: null, status: 'RECOGNIZED', vatTreatment: 'DOMESTIC_PURCHASE', vatRate: '23', requiredInputs: [] };
    setActiveLocale('pl'); const pl = mapRecognizedCost(candidate);
    setActiveLocale('en'); const en = mapRecognizedCost(candidate);
    expect(en.candidate).toEqual(pl.candidate); expect(en.state).toBe(pl.state); expect(en.amount).toBe(pl.amount); expect(en.currency).toBe('PLN');
  });
});
