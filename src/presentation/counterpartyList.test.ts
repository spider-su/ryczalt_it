import { afterEach, describe, expect, it } from 'vitest';
import type { Counterparty } from '../model/accounting';
import { getActiveLocale, setActiveLocale } from '../i18n';
import { counterpartyInvoiceCount, counterpartyTaxIdentifier, filterCounterparties } from './counterpartyList';

const originalLocale = getActiveLocale();
const counterparties: Counterparty[] = [
  { id: '1', displayName: 'Action S.A.', legalName: 'Action Spółka Akcyjna', alias: 'Action S.A.', taxIdentifier: 'PL 525-276-7755', country: 'PL', ruleCount: 0, invoiceCount: 2 },
  { id: '2', displayName: 'BP', legalName: 'BP Europa SE', alias: null, taxIdentifier: null, country: 'PL', ruleCount: 0, invoiceCount: 1 },
  { id: '3', displayName: 'Example GmbH', legalName: 'Example GmbH', alias: null, taxIdentifier: 'DE123456789', country: 'DE', ruleCount: 0, invoiceCount: 5 }
];

afterEach(() => setActiveLocale(originalLocale));

describe('counterparty list presentation', () => {
  it('searches display and legal names without case or whitespace sensitivity', () => {
    expect(filterCounterparties(counterparties, '  ACTION   s.a. ')[0]?.id).toBe('1');
    expect(filterCounterparties(counterparties, 'SPÓŁKA AKCYJNA')[0]?.id).toBe('1');
    expect(filterCounterparties(counterparties, 'bp europa')[0]?.id).toBe('2');
  });

  it('matches tax IDs with separators and an optional country prefix', () => {
    expect(filterCounterparties(counterparties, '5252767755').map((item) => item.id)).toEqual(['1']);
    expect(filterCounterparties(counterparties, 'PL 525-276-7755').map((item) => item.id)).toEqual(['1']);
    expect(filterCounterparties(counterparties, 'DE 123 456 789').map((item) => item.id)).toEqual(['3']);
  });

  it('returns a distinct empty result for a search with no matches and ignores whitespace-only queries', () => {
    expect(filterCounterparties(counterparties, 'no such company')).toEqual([]);
    expect(filterCounterparties(counterparties, '   ')).toBe(counterparties);
  });

  it('labels Polish NIP, uses a generic foreign tax identifier label, and contextualizes missing IDs', () => {
    setActiveLocale('en');
    expect(counterpartyTaxIdentifier(counterparties[0]!)).toBe('NIP 525-276-7755');
    expect(counterpartyTaxIdentifier(counterparties[2]!)).toBe('Tax ID DE123456789');
    expect(counterpartyTaxIdentifier(counterparties[1]!)).toBe('Tax ID unavailable');
    setActiveLocale('pl');
    expect(counterpartyTaxIdentifier(counterparties[1]!)).toBe('Brak identyfikatora podatkowego');
  });

  it('uses localized singular and plural forms for invoice counts', () => {
    setActiveLocale('en');
    expect(counterpartyInvoiceCount(1)).toBe('1 invoice');
    expect(counterpartyInvoiceCount(2)).toBe('2 invoices');
    setActiveLocale('pl');
    expect(counterpartyInvoiceCount(1)).toBe('1 faktura');
    expect(counterpartyInvoiceCount(2)).toBe('2 faktury');
    expect(counterpartyInvoiceCount(5)).toBe('5 faktur');
  });
});
