export type UiLocale = 'pl' | 'en';
export const DEFAULT_UI_LOCALE: UiLocale = 'pl';
export const SUPPORTED_UI_LOCALES: UiLocale[] = ['pl', 'en'];
export const intlLocale: Record<UiLocale, string> = { pl: 'pl-PL', en: 'en-GB' };

const translations = {
  pl: {
    auth: { title: 'Investory Accounting', subtitle: 'Zaloguj się, aby zobaczyć dane księgowe', email: 'E-mail', password: 'Hasło', emailPlaceholder: 'nazwa@firma.pl', signIn: 'Zaloguj się', signingIn: 'Logowanie…', secureNote: 'Token sesji jest przechowywany w bezpiecznym magazynie urządzenia.', errors: { invalid_credentials: 'Nieprawidłowy e-mail lub hasło.', invalid_response: 'Odpowiedź logowania jest nieprawidłowa.', unavailable: 'Nie udało się połączyć z serwerem. Spróbuj ponownie.', unknown: 'Logowanie nie powiodło się. Spróbuj ponownie.' } },
    app: { home: 'Start', invoices: 'Faktury', settlements: 'Rozliczenia', more: 'Więcej' },
    common: { all: 'Wszystkie', sales: 'Sprzedaż', purchases: 'Zakupy', filters: 'Filtry', close: 'Zamknij', retry: 'Spróbuj ponownie', loading: 'Ładowanie…', unavailable: 'Nie udało się pobrać danych.', paid: 'Opłacone', unpaid: 'Nieopłacone', partial: 'Częściowo opłacone', notDue: 'Jeszcze niewymagalne', overdue: 'Po terminie', unknown: 'Brak danych', thisMonth: 'Ten miesiąc', previousMonth: 'Poprzedni miesiąc', last3Months: 'Ostatnie 3 miesiące', customRange: 'Własny zakres', back: 'Wstecz', next: 'Dalej', save: 'Zapisz', confirm: 'Potwierdź', cancel: 'Anuluj', select: 'Wybierz', today: 'Dzisiaj' },
    month: { selector: 'Wybrany miesiąc', previous: 'Poprzedni miesiąc', next: 'Następny miesiąc' },
    home: { greeting: 'Dzień dobry', healthyTitle: 'Wszystko załatwione', healthyBody: 'Nie masz teraz nic do zrobienia.', processingTitle: 'Aktualizujemy dane', processingBody: 'Synchronizacja i obliczenia jeszcze trwają.', unknownTitle: 'Brak danych', unknownBody: 'Nie udało się określić stanu tego miesiąca.', attentionTitle: 'Wymaga Twojej uwagi', attentionBody: 'Sprawdź elementy, które wymagają działania.', informationalTitle: 'Dane są dostępne', informationalBody: 'Nie ma teraz niczego, co wymaga Twojego działania.', period: 'Bieżący okres', revenue: 'Przychód', costs: 'Koszty', income: 'Dochód (szac.)', payments: 'Najbliższe płatności', noPayments: 'Brak najbliższych płatności', obligations: 'Do zapłaty', attention: 'Wymaga uwagi', noIssues: 'Brak elementów wymagających działania', issueCount: 'rzeczy do sprawdzenia', ryczalt: 'Ryczałt 12%' },
    invoices: { title: 'Faktury', search: 'Szukaj kontrahenta, numeru lub NIP', emptyTitle: 'Brak faktur', emptyBody: 'Tutaj pojawią się Twoje faktury.', filteredTitle: 'Brak wyników', filteredBody: 'Nie znaleźliśmy faktur pasujących do wybranych filtrów.', clearFilters: 'Wyłącz filtry', details: 'Szczegóły faktury', allInSelectedMonth: 'Wszystkie w wybranym miesiącu', counterparty: 'Kontrahent', number: 'Numer faktury', issueDate: 'Data wystawienia', status: 'Status płatności', type: 'Rodzaj', currency: 'Waluta', secondary: 'Dodatkowe informacje', ksef: 'KSeF', source: 'Źródło', category: 'Kategoria' },
    settlements: { title: 'Rozliczenia', upcoming: 'Najbliższe płatności', history: 'Historia', noPayments: 'Brak płatności w tym okresie', noHistory: 'Brak zapisanych płatności w tym okresie', historyError: 'Nie udało się pobrać historii rozliczeń.', period: 'Okres', dueDate: 'Termin płatności', amount: 'Kwota', paidAmount: 'Opłacono', remaining: 'Pozostało', status: 'Status' },
    more: { title: 'Więcej', company: 'Dane firmy', systems: 'Połączone systemy', settings: 'Ustawienia', reports: 'Eksporty i raporty', help: 'Pomoc i kontakt', signOut: 'Wyloguj się', connected: 'Połączono', notConnected: 'Nie połączono', unknownStatus: 'Brak danych', ksef: 'KSeF', bank: 'Bank', zus: 'ZUS' },
    settings: { title: 'Ustawienia', language: 'Język', languageDescription: 'Wybierz język aplikacji', polish: 'Polski', english: 'English' },
    actions: { title: 'Co chcesz zrobić?', invoice: 'Wystaw fakturę', cost: 'Dodaj koszt', income: 'Dodaj przychód', close: 'Zamknij', onlyAvailable: 'Dostępne akcje' },
    invoice: { title: 'Wystaw fakturę', client: 'Klient', chooseClient: 'Wybierz klienta', clientSearch: 'Szukaj po nazwie lub NIP', newClient: 'Nowy klient', item: 'Pozycja', description: 'Opis usługi lub produktu', quantity: 'Ilość', unitPrice: 'Cena jednostkowa', currency: 'Waluta', issueDate: 'Data wystawienia', dueDate: 'Termin płatności', review: 'Sprawdź fakturę', total: 'Razem', issue: 'Wystaw fakturę', unavailable: 'Wystawianie faktur nie jest jeszcze obsługiwane przez backend.', clientRequired: 'Wybierz klienta.', descriptionRequired: 'Podaj opis pozycji.', amountRequired: 'Podaj poprawną kwotę.', dateRequired: 'Podaj datę wystawienia.', dueDateRequired: 'Podaj termin płatności.' },
    cost: { title: 'Dodaj koszt', chooseDocument: 'Wybierz dokument', chooseDocumentHint: 'PDF lub zdjęcie faktury', recognize: 'Odczytaj dokument', confirm: 'Dodaj koszt', recognized: 'Odczytane dane', noDocument: 'Wybierz dokument, aby kontynuować.', saved: 'Dokument zapisany do weryfikacji.', duplicate: 'Ta faktura jest już w Twoich dokumentach.', failed: 'Nie udało się odczytać dokumentu. Sprawdź plik i spróbuj ponownie.', unsupportedDirection: 'Wybrany dokument nie jest dokumentem zakupu.', vatTreatment: 'Sposób rozliczenia VAT', domesticPurchase: 'Zakup krajowy', vatRate: 'Stawka VAT', vatRateRequired: 'Podaj stawkę VAT wymaganą do zapisania kosztu.', accountingDecisionRequired: 'Wybierz sposób rozliczenia VAT, aby kontynuować.', errors: { validation_required: 'Dokument wymaga dodatkowych danych do zapisania.', authentication_required: 'Zaloguj się ponownie, aby kontynuować.', unavailable: 'Nie udało się połączyć z serwerem. Spróbuj ponownie.', backend_required: 'Ten dokument wymaga decyzji księgowej dostępnej w panelu webowym.', unknown_error: 'Nie udało się zapisać dokumentu. Spróbuj ponownie.' }, treatments: { domestic: 'Zakup krajowy', eu: 'Import usług z UE', nonEu: 'Import usług spoza UE', unknown: 'Opcja wymaga sprawdzenia w panelu webowym' }, country: 'Kraj kontrahenta', backendRequired: 'Ten dokument wymaga decyzji księgowej dostępnej w panelu webowym.' },
    income: { title: 'Dodaj przychód', amount: 'Kwota', date: 'Data', description: 'Opis lub źródło', submit: 'Dodaj przychód', amountRequired: 'Podaj poprawną kwotę.', dateRequired: 'Podaj datę.', descriptionRequired: 'Podaj opis lub źródło.', unavailable: 'Ręczne dodawanie przychodu nie jest jeszcze obsługiwane przez backend.' },
    backend: { actionUnavailable: 'Ta czynność nie jest jeszcze dostępna.', requestFailed: 'Nie udało się wykonać operacji. Sprawdź połączenie i spróbuj ponownie.' },
    payments: { types: { ppe: 'PPE', vat: 'VAT', zus: 'ZUS', unknown: 'Brak danych' }, status: { paid: 'Opłacone', overdue: 'Po terminie', partial: 'Częściowo opłacone', unpaid: 'Nieopłacone', notDue: 'Jeszcze niewymagalne', unknown: 'Brak danych' } }
  },
  en: {
    auth: { title: 'Investory Accounting', subtitle: 'Sign in to view your accounting data', email: 'Email', password: 'Password', emailPlaceholder: 'name@company.com', signIn: 'Sign in', signingIn: 'Signing in…', secureNote: 'Your session token is stored securely on this device.', errors: { invalid_credentials: 'The email or password is incorrect.', invalid_response: 'The sign-in response was invalid.', unavailable: 'We could not connect to the server. Try again.', unknown: 'Sign-in failed. Try again.' } },
    app: { home: 'Home', invoices: 'Invoices', settlements: 'Settlements', more: 'More' },
    common: { all: 'All', sales: 'Sales', purchases: 'Purchases', filters: 'Filters', close: 'Close', retry: 'Try again', loading: 'Loading…', unavailable: 'We could not load the data.', paid: 'Paid', unpaid: 'Unpaid', partial: 'Partially paid', notDue: 'Not due yet', overdue: 'Overdue', unknown: 'No data', thisMonth: 'This month', previousMonth: 'Previous month', last3Months: 'Last 3 months', customRange: 'Custom range', back: 'Back', next: 'Next', save: 'Save', confirm: 'Confirm', cancel: 'Cancel', select: 'Select', today: 'Today' },
    month: { selector: 'Selected month', previous: 'Previous month', next: 'Next month' },
    home: { greeting: 'Good morning', healthyTitle: 'All done', healthyBody: 'You have nothing to do right now.', processingTitle: 'Updating your data', processingBody: 'Synchronisation and calculations are still in progress.', unknownTitle: 'No data', unknownBody: 'We could not determine this month’s status.', attentionTitle: 'Needs your attention', attentionBody: 'Review the items that need action.', informationalTitle: 'Information available', informationalBody: 'There is nothing you need to do right now.', period: 'Current period', revenue: 'Revenue', costs: 'Costs', income: 'Estimated income', payments: 'Upcoming payments', noPayments: 'No upcoming payments', obligations: 'To pay', attention: 'Needs attention', noIssues: 'Nothing needs your attention', issueCount: 'items to check', ryczalt: 'Flat-rate tax 12%' },
    invoices: { title: 'Invoices', search: 'Search counterparty, number or NIP', emptyTitle: 'No invoices', emptyBody: 'Your invoices will appear here.', filteredTitle: 'No results', filteredBody: 'No invoices match the selected filters.', clearFilters: 'Clear filters', details: 'Invoice details', allInSelectedMonth: 'All in the selected month', counterparty: 'Counterparty', number: 'Invoice number', issueDate: 'Issue date', status: 'Payment status', type: 'Type', currency: 'Currency', secondary: 'Additional information', ksef: 'KSeF', source: 'Source', category: 'Category' },
    settlements: { title: 'Settlements', upcoming: 'Upcoming payments', history: 'History', noPayments: 'No payments for this period', noHistory: 'No recorded payments for this period', historyError: 'We could not load settlement history.', period: 'Period', dueDate: 'Due date', amount: 'Amount', paidAmount: 'Paid', remaining: 'Remaining', status: 'Status' },
    more: { title: 'More', company: 'Company details', systems: 'Connected systems', settings: 'Settings', reports: 'Exports and reports', help: 'Help and contact', signOut: 'Sign out', connected: 'Connected', notConnected: 'Not connected', unknownStatus: 'No data', ksef: 'KSeF', bank: 'Bank', zus: 'ZUS' },
    settings: { title: 'Settings', language: 'Language', languageDescription: 'Choose the app language', polish: 'Polski', english: 'English' },
    actions: { title: 'What do you want to do?', invoice: 'Issue an invoice', cost: 'Add a cost', income: 'Add income', close: 'Close', onlyAvailable: 'Available actions' },
    invoice: { title: 'Issue an invoice', client: 'Client', chooseClient: 'Choose a client', clientSearch: 'Search by name or NIP', newClient: 'New client', item: 'Item', description: 'Service or product description', quantity: 'Quantity', unitPrice: 'Unit price', currency: 'Currency', issueDate: 'Issue date', dueDate: 'Due date', review: 'Review invoice', total: 'Total', issue: 'Issue invoice', unavailable: 'Invoice issuing is not yet supported by the backend.', clientRequired: 'Choose a client.', descriptionRequired: 'Enter an item description.', amountRequired: 'Enter a valid amount.', dateRequired: 'Enter the issue date.', dueDateRequired: 'Enter the due date.' },
    cost: { title: 'Add a cost', chooseDocument: 'Choose a document', chooseDocumentHint: 'PDF or invoice photo', recognize: 'Read document', confirm: 'Add cost', recognized: 'Recognised data', noDocument: 'Choose a document to continue.', saved: 'Document saved for review.', duplicate: 'This invoice is already in your documents.', failed: 'We could not read the document. Check the file and try again.', unsupportedDirection: 'The selected document is not a purchase document.', vatTreatment: 'VAT treatment', domesticPurchase: 'Domestic purchase', vatRate: 'VAT rate', vatRateRequired: 'Enter the VAT rate required to save the cost.', accountingDecisionRequired: 'Choose a VAT treatment to continue.', errors: { validation_required: 'This document needs more information before it can be saved.', authentication_required: 'Sign in again to continue.', unavailable: 'We could not connect to the server. Try again.', backend_required: 'This document requires an accounting decision in the web panel.', unknown_error: 'We could not save the document. Try again.' }, treatments: { domestic: 'Domestic purchase', eu: 'Import of services from the EU', nonEu: 'Import of services from outside the EU', unknown: 'This option requires review in the web panel' }, country: 'Counterparty country', backendRequired: 'This document requires an accounting decision in the web panel.' },
    income: { title: 'Add income', amount: 'Amount', date: 'Date', description: 'Description or source', submit: 'Add income', amountRequired: 'Enter a valid amount.', dateRequired: 'Enter the date.', descriptionRequired: 'Enter a description or source.', unavailable: 'Manual income is not yet supported by the backend.' },
    backend: { actionUnavailable: 'This action is not available yet.', requestFailed: 'The operation failed. Check your connection and try again.' },
    payments: { types: { ppe: 'PPE', vat: 'VAT', zus: 'ZUS', unknown: 'No data' }, status: { paid: 'Paid', overdue: 'Overdue', partial: 'Partially paid', unpaid: 'Unpaid', notDue: 'Not due yet', unknown: 'No data' } }
  }
} as const;

let activeLocale: UiLocale = DEFAULT_UI_LOCALE;
export function setActiveLocale(value: UiLocale): void { activeLocale = value; }
export function getActiveLocale(): UiLocale { return activeLocale; }
export function toIntlLocale(value: UiLocale = activeLocale): string { return intlLocale[value]; }
export function t(path: string, valueLocale: UiLocale = activeLocale): string { const value = path.split('.').reduce<unknown>((current, key) => (current as Record<string, unknown> | undefined)?.[key], translations[valueLocale]); return typeof value === 'string' ? value : path; }
export function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string { if (!value) return t('common.unknown'); const date = new Date(`${value.slice(0, 10)}T00:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(toIntlLocale(), options).format(date); }
export function formatMonth(value: string | null | undefined): string {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return t('common.unknown');
  const date = new Date(`${value}-01T00:00:00`);
  const [year, month] = value.split('-').map(Number);
  return Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() + 1 !== month
    ? t('common.unknown')
    : new Intl.DateTimeFormat(toIntlLocale(), { month: 'long', year: 'numeric' }).format(date);
}
function exactDecimalParts(amount: string | number): { negative: boolean; integer: string; fraction: string } | null {
  const value = typeof amount === 'number' ? String(amount) : amount.trim();
  const match = value.match(/^(?<sign>-)?(?<integer>\d+)(?:\.(?<fraction>\d+))?$/);
  if (!match?.groups?.integer) return null;
  const integer = match.groups.integer.replace(/^0+(?=\d)/, '');
  return { negative: Boolean(match.groups.sign), integer, fraction: (match.groups.fraction ?? '').padEnd(2, '0') };
}

function formatExactDecimal(amount: string | number, currency?: string | null): string | null {
  const parts = exactDecimalParts(amount);
  if (!parts) return null;
  const locale = toIntlLocale();
  const formatter = currency
    ? new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const groupedInteger = new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 }).format(BigInt(parts.integer));
  const template = formatter.formatToParts(parts.negative ? -0 : 0);
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.';
  return template.map((part) => part.type === 'integer'
    ? `${groupedInteger}${parts.fraction ? `${decimal}${parts.fraction}` : ''}`
    : part.value).join('');
}

export function formatCurrency(amount: string | number | null | undefined, currency?: string | null): string {
  if (amount == null) return t('common.unknown');
  try {
    return formatExactDecimal(amount, currency) ?? t('common.unknown');
  } catch {
    return t('common.unknown');
  }
}
export type PaymentLabelKey = 'ppe' | 'vat' | 'zus' | 'unknown';
export function paymentLabelKey(type: string): PaymentLabelKey { const normalized = type.toUpperCase(); return normalized === 'RYCZALT' ? 'ppe' : normalized === 'VAT' ? 'vat' : normalized === 'ZUS' ? 'zus' : 'unknown'; }
export function paymentLabel(type: string): string { return t(`payments.types.${paymentLabelKey(type)}`); }
export type PaymentStatusKey = 'paid' | 'overdue' | 'partial' | 'unpaid' | 'notDue' | 'unknown';
export function paymentStatusKey(status: string): PaymentStatusKey { const normalized = status.toUpperCase(); if (['PAID', 'SETTLED', 'MATCHED'].includes(normalized)) return 'paid'; if (normalized === 'OVERDUE') return 'overdue'; if (normalized === 'PARTIAL') return 'partial'; if (['NOT_PAID', 'DUE'].includes(normalized)) return 'unpaid'; if (normalized === 'NOT_DUE') return 'notDue'; return 'unknown'; }
export function paymentStatusLabel(status: string): string { return t(`payments.status.${paymentStatusKey(status)}`); }
export function costInputLabel(field: string, fallback?: string | null): string { if (field === 'vatTreatment') return t('cost.vatTreatment'); if (field === 'vatRate') return t('cost.vatRate'); if (field === 'counterpartyCountry') return t('cost.country'); return fallback || t('common.unknown'); }
export function costOptionLabel(value: string, fallback?: string | null): string { if (value === 'DOMESTIC_PURCHASE') return t('cost.treatments.domestic'); if (value === 'IMPORT_OF_SERVICES_EU') return t('cost.treatments.eu'); if (value === 'IMPORT_OF_SERVICES_NON_EU') return t('cost.treatments.nonEu'); return fallback || t('cost.treatments.unknown'); }
export const translationsByLocale = translations;
