import { afterEach, describe, expect, it } from 'vitest';
import { formatCurrency, paymentStatusKey, setActiveLocale, t, translationsByLocale } from './index';
afterEach(() => setActiveLocale('pl'));
describe('canonical localized presentation', () => { it('keeps dictionaries structurally aligned', () => { expect(Object.keys(translationsByLocale.pl)).toEqual(Object.keys(translationsByLocale.en)); }); it('localizes canonical payment statuses and exact money', () => { expect(paymentStatusKey('PARTIALLY_PAID')).toBe('partial'); expect(paymentStatusKey('OPEN')).toBe('unpaid'); setActiveLocale('en'); expect(t('counterparties.title')).toBe('Counterparties'); expect(formatCurrency('1234567.89', 'PLN')).toContain('1,234,567.89'); }); });
