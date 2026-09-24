import { afterEach, describe, expect, it } from 'vitest';
import {
  completenessStatusLabel, formatCurrency, invoicePaymentStatusKey, invoicePaymentStatusLabel,
  paymentStatusKey, paymentVerificationLabel, periodActionLabel, periodStatusLabel,
  setActiveLocale, t, translationsByLocale
} from './index';

afterEach(() => setActiveLocale('pl'));

function translationDifferences(left: unknown, right: unknown, prefix = ''): string[] {
  if (left && right && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((key) => translationDifferences(a[key], b[key], prefix ? `${prefix}.${key}` : key));
  }
  return typeof left === typeof right ? [] : [prefix];
}

function normalizeSpace(value: string): string { return value.replace(/[\u00a0\u202f]/g, ' '); }

describe('canonical localized presentation', () => {
  it('checks recursive PL/EN translation path parity', () => {
    expect(translationDifferences(translationsByLocale.pl, translationsByLocale.en)).toEqual([]);
    expect(translationDifferences({ section: { nested: 'PL' } }, { section: { nested: 'EN', missing: 'EN' } })).toEqual(['section.missing']);
  });

  it('shows whole currency units consistently while keeping decimal handling exact', () => {
    expect(normalizeSpace(formatCurrency('0', 'PLN'))).toBe('0 zł');
    expect(normalizeSpace(formatCurrency('0.0', 'PLN'))).toBe('0 zł');
    expect(normalizeSpace(formatCurrency('0.00', 'PLN'))).toBe('0 zł');
    expect(normalizeSpace(formatCurrency('-0.00', 'PLN'))).toBe('0 zł');
    expect(normalizeSpace(formatCurrency('298.00', 'PLN'))).toBe('298 zł');
    expect(normalizeSpace(formatCurrency('406.50', 'PLN'))).toBe('406 zł');
    expect(normalizeSpace(formatCurrency('388.1400', 'PLN'))).toBe('388 zł');
    expect(normalizeSpace(formatCurrency('388.9999', 'PLN'))).toBe('388 zł');
    expect(normalizeSpace(formatCurrency('7044.00', 'PLN'))).toBe('7 044 zł');
    expect(normalizeSpace(formatCurrency('1234567.89', 'PLN'))).toBe('1 234 567 zł');
    expect(normalizeSpace(formatCurrency('406.50', 'EUR'))).toBe('406 €');
    expect(normalizeSpace(formatCurrency('1234567.89'))).toBe('1 234 567');
    expect(formatCurrency(null)).toBe('Kwota niedostępna');
    setActiveLocale('en');
    expect(normalizeSpace(formatCurrency('406.50', 'PLN'))).toBe('PLN 406');
    expect(normalizeSpace(formatCurrency('406.50', 'EUR'))).toBe('€406');
    expect(normalizeSpace(formatCurrency('1234567.89', 'PLN'))).toBe('PLN 1,234,567');
    expect(formatCurrency(null)).toBe('Amount unavailable');
  });

  it('keeps obligation and invoice payment vocabularies distinct and localized', () => {
    expect(paymentStatusKey('PARTIALLY_PAID')).toBe('partial');
    expect(paymentStatusKey('OPEN')).toBe('unpaid');
    expect(paymentStatusKey('MANUALLY_CONFIRMED')).toBe('unknown');
    const cases = [
      ['MATCHED', 'matched', 'Opłacone'],
      ['MANUALLY_CONFIRMED', 'manuallyConfirmed', 'Opłacone ręcznie'],
      ['PARTIALLY_MATCHED', 'partiallyMatched', 'Częściowo opłacone'],
      ['UNMATCHED', 'unmatched', 'Nieopłacone'],
      ['NOT_REQUIRED', 'notRequired', 'Weryfikacja płatności niewymagana'],
      ['FUTURE_STATUS', 'unknown', 'Nieznany status płatności']
    ] as const;
    for (const [status, key, label] of cases) {
      expect(invoicePaymentStatusKey(status)).toBe(key);
      expect(invoicePaymentStatusLabel(status)).toBe(label);
    }
    expect(invoicePaymentStatusKey(null)).toBe('unknown');
    expect(invoicePaymentStatusLabel(null)).toBe('Nieznany status płatności');
    expect(paymentVerificationLabel('REQUIRED')).toBe('Wymagana');
    expect(paymentVerificationLabel('NOT_REQUIRED')).toBe('Niewymagana');
  });

  it('localizes canonical period enums and payment verification in Polish', () => {
    expect(t('invoices.paymentVerification')).toBe('Weryfikacja płatności');
    expect(periodStatusLabel('FROZEN')).toBe('Zamrożony');
    expect(completenessStatusLabel('COMPLETE')).toBe('Kompletne');
    expect(periodActionLabel('REOPEN')).toBe('Otwórz ponownie');
    expect(periodStatusLabel('FUTURE')).toBe('Brak danych');
  });
});
