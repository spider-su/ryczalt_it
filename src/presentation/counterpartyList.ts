import type { Counterparty } from '../model/accounting';
import { t, toIntlLocale } from '../i18n';

function normalizeText(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeIdentifier(value: string): string {
  return value.normalize('NFKC').toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function filterCounterparties(items: Counterparty[], query: string): Counterparty[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return items;
  const normalizedIdentifierQuery = normalizeIdentifier(query);
  return items.filter((item) => {
    const names = [item.displayName, item.legalName].filter((value): value is string => Boolean(value)).map(normalizeText);
    if (names.some((name) => name.includes(normalizedQuery))) return true;
    if (!normalizedIdentifierQuery || !item.taxIdentifier) return false;

    const identifier = normalizeIdentifier(item.taxIdentifier);
    const countryPrefix = item.country ? normalizeIdentifier(item.country) : '';
    const identifierWithoutCountry = countryPrefix && identifier.startsWith(countryPrefix) ? identifier.slice(countryPrefix.length) : identifier;
    const queryWithoutCountry = countryPrefix && normalizedIdentifierQuery.startsWith(countryPrefix)
      ? normalizedIdentifierQuery.slice(countryPrefix.length)
      : normalizedIdentifierQuery;
    return identifier.includes(normalizedIdentifierQuery)
      || identifierWithoutCountry.includes(normalizedIdentifierQuery)
      || Boolean(queryWithoutCountry && identifierWithoutCountry.includes(queryWithoutCountry));
  });
}

export function counterpartyTaxIdentifier(item: Counterparty): string {
  if (!item.taxIdentifier?.trim()) return t('counterparties.taxIdUnavailable');
  const isPolish = item.country?.trim().toUpperCase() === 'PL';
  const identifier = isPolish ? item.taxIdentifier.trim().replace(/^PL[\s.:/-]*/i, '') : item.taxIdentifier.trim();
  return `${t(isPolish ? 'counterparties.nip' : 'counterparties.taxId')} ${identifier}`;
}

export function counterpartyInvoiceCount(count: number): string {
  const pluralCategory = new Intl.PluralRules(toIntlLocale()).select(count);
  return `${count} ${t(`counterparties.invoiceCount.${pluralCategory}`)}`;
}
