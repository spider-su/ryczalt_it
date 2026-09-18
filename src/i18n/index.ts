export const locale = 'pl-PL';

const strings = {
  auth: { title: 'Investory Accounting', subtitle: 'Zaloguj się, aby zobaczyć dane księgowe', email: 'E-mail', password: 'Hasło', emailPlaceholder: 'nazwa@firma.pl', signIn: 'Zaloguj się', signingIn: 'Logowanie…', secureNote: 'Token sesji jest przechowywany w bezpiecznym magazynie urządzenia.' },
  app: { home: 'Start', invoices: 'Faktury', settlements: 'Rozliczenia', more: 'Więcej' },
  common: {
    all: 'Wszystkie', sales: 'Sprzedaż', purchases: 'Zakupy', filters: 'Filtry', close: 'Zamknij',
    retry: 'Spróbuj ponownie', loading: 'Ładowanie…', unavailable: 'Nie udało się pobrać danych.',
    paid: 'Opłacone', unpaid: 'Nieopłacone', partial: 'Częściowo opłacone', notDue: 'Jeszcze niewymagalne', overdue: 'Po terminie', unknown: 'Brak danych',
    thisMonth: 'Ten miesiąc', previousMonth: 'Poprzedni miesiąc', last3Months: 'Ostatnie 3 miesiące', customRange: 'Własny zakres',
    back: 'Wstecz', next: 'Dalej', save: 'Zapisz', confirm: 'Potwierdź', cancel: 'Anuluj', select: 'Wybierz', today: 'Dzisiaj'
  },
  month: { selector: 'Wybrany miesiąc', previous: 'Poprzedni miesiąc', next: 'Następny miesiąc' },
  home: {
    greeting: 'Dzień dobry', healthyTitle: 'Wszystko załatwione', healthyBody: 'Nie masz teraz nic do zrobienia.', processingTitle: 'Aktualizujemy dane', processingBody: 'Synchronizacja i obliczenia jeszcze trwają.', unknownTitle: 'Brak danych', unknownBody: 'Nie udało się określić stanu tego miesiąca.',
    attentionTitle: 'Wymaga Twojej uwagi', attentionBody: 'Sprawdź elementy, które wymagają działania.',
    period: 'Bieżący okres', revenue: 'Przychód', costs: 'Koszty', income: 'Dochód (szac.)',
    payments: 'Najbliższe płatności', noPayments: 'Brak najbliższych płatności',
    obligations: 'Do zapłaty', attention: 'Wymaga uwagi', noIssues: 'Brak elementów wymagających działania', issueCount: 'rzeczy do sprawdzenia'
  },
  invoices: {
    title: 'Faktury', search: 'Szukaj kontrahenta, numeru lub NIP', emptyTitle: 'Brak faktur',
    emptyBody: 'Tutaj pojawią się Twoje faktury.', filteredTitle: 'Brak wyników',
    filteredBody: 'Nie znaleźliśmy faktur pasujących do wybranych filtrów.', clearFilters: 'Wyłącz filtry',
    details: 'Szczegóły faktury', allInSelectedMonth: 'Wszystkie w wybranym miesiącu', counterparty: 'Kontrahent', number: 'Numer faktury', issueDate: 'Data wystawienia',
    status: 'Status płatności', type: 'Rodzaj', currency: 'Waluta', secondary: 'Dodatkowe informacje', ksef: 'KSeF', source: 'Źródło', category: 'Kategoria'
  },
  settlements: {
    title: 'Rozliczenia', upcoming: 'Najbliższe płatności', history: 'Historia', noPayments: 'Brak płatności w tym okresie', noHistory: 'Brak zapisanych płatności w tym okresie',
    period: 'Okres', dueDate: 'Termin płatności', amount: 'Kwota', paidAmount: 'Opłacono', remaining: 'Pozostało', status: 'Status', historyUnavailable: 'Historia rozliczeń nie jest jeszcze dostępna.'
  },
  more: {
    title: 'Więcej', company: 'Dane firmy', systems: 'Połączone systemy', settings: 'Ustawienia', reports: 'Eksporty i raporty',
    help: 'Pomoc i kontakt', signOut: 'Wyloguj się', connected: 'Połączono', notConnected: 'Nie połączono', unknownStatus: 'Brak danych', ksef: 'KSeF', bank: 'Bank', zus: 'ZUS'
  },
  actions: {
    title: 'Co chcesz zrobić?', invoice: 'Wystaw fakturę', cost: 'Dodaj koszt', income: 'Dodaj przychód', close: 'Zamknij', onlyAvailable: 'Dostępne akcje'
  },
  invoice: {
    title: 'Wystaw fakturę', client: 'Klient', chooseClient: 'Wybierz klienta', clientSearch: 'Szukaj po nazwie lub NIP', newClient: 'Nowy klient',
    item: 'Pozycja', description: 'Opis usługi lub produktu', quantity: 'Ilość', unitPrice: 'Cena jednostkowa',
    currency: 'Waluta', issueDate: 'Data wystawienia', dueDate: 'Termin płatności', review: 'Sprawdź fakturę',
    total: 'Razem', issue: 'Wystaw fakturę', unavailable: 'Wystawianie faktur nie jest jeszcze obsługiwane przez backend.',
    clientRequired: 'Wybierz klienta.', descriptionRequired: 'Podaj opis pozycji.', amountRequired: 'Podaj poprawną kwotę.',
    dateRequired: 'Podaj datę wystawienia.', dueDateRequired: 'Podaj termin płatności.'
  },
  cost: {
    title: 'Dodaj koszt', chooseDocument: 'Wybierz dokument', chooseDocumentHint: 'PDF lub zdjęcie faktury', recognize: 'Odczytaj dokument',
    confirm: 'Dodaj koszt', recognized: 'Odczytane dane', noDocument: 'Wybierz dokument, aby kontynuować.', saved: 'Dokument zapisany do weryfikacji.',
    duplicate: 'Ta faktura jest już w Twoich dokumentach.', failed: 'Nie udało się odczytać dokumentu. Sprawdź plik i spróbuj ponownie.',
    unsupportedDirection: 'Wybrany dokument nie jest dokumentem zakupu.', vatTreatment: 'Sposób rozliczenia VAT', domesticPurchase: 'Zakup krajowy',
    vatRate: 'Stawka VAT', vatRateRequired: 'Podaj stawkę VAT wymaganą do zapisania kosztu.',
    accountingDecisionRequired: 'Wybierz sposób rozliczenia VAT, aby kontynuować.',
    errors: { validation_required: 'Dokument wymaga dodatkowych danych do zapisania.', authentication_required: 'Zaloguj się ponownie, aby kontynuować.', unavailable: 'Nie udało się połączyć z serwerem. Spróbuj ponownie.', backend_required: 'Ten dokument wymaga decyzji księgowej dostępnej w panelu webowym.', unknown_error: 'Nie udało się zapisać dokumentu. Spróbuj ponownie.' },
    treatments: { domestic: 'Zakup krajowy', eu: 'Import usług z UE', nonEu: 'Import usług spoza UE', unknown: 'Opcja wymaga sprawdzenia w panelu webowym' }, country: 'Kraj kontrahenta', backendRequired: 'Ten dokument wymaga decyzji księgowej dostępnej w panelu webowym.'
  },
  income: {
    title: 'Dodaj przychód', amount: 'Kwota', date: 'Data', description: 'Opis lub źródło', submit: 'Dodaj przychód',
    amountRequired: 'Podaj poprawną kwotę.', dateRequired: 'Podaj datę.', descriptionRequired: 'Podaj opis lub źródło.', unavailable: 'Ręczne dodawanie przychodu nie jest jeszcze obsługiwane przez backend.'
  },
  backend: { actionUnavailable: 'Ta czynność nie jest jeszcze dostępna.', requestFailed: 'Nie udało się wykonać operacji. Sprawdź połączenie i spróbuj ponownie.' }
} as const;

export function t(path: string): string {
  const value = path.split('.').reduce<unknown>((current, key) => (current as Record<string, unknown> | undefined)?.[key], strings);
  return typeof value === 'string' ? value : path;
}

export function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  if (!value) return t('common.unknown');
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatMonth(value: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T00:00:00`));
}

export function formatCurrency(amount: string | number | null | undefined, currency?: string | null): string {
  const numeric = amount == null ? NaN : Number(amount);
  if (!Number.isFinite(numeric)) return t('common.unknown');
  if (!currency) return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric);
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric); }
  catch { return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric); }
}

export function paymentLabel(type: string): string { const normalized = type.toUpperCase(); return normalized === 'RYCZALT' ? 'PPE' : normalized === 'VAT' ? 'VAT' : normalized === 'ZUS' ? 'ZUS' : t('common.unknown'); }
export function paymentStatusLabel(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === 'PAID' || normalized === 'SETTLED' || normalized === 'MATCHED') return t('common.paid');
  if (normalized === 'OVERDUE') return t('common.overdue');
  if (normalized === 'PARTIAL') return t('common.partial');
  if (normalized === 'NOT_PAID' || normalized === 'DUE') return t('common.unpaid');
  if (normalized === 'NOT_DUE') return t('common.notDue');
  return t('common.unknown');
}

export { strings };
