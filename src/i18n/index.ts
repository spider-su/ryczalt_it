export const locale = 'pl-PL';

const strings = {
  app: { home: 'Start', invoices: 'Faktury', settlements: 'Rozliczenia', more: 'Więcej' },
  common: {
    all: 'Wszystkie', sales: 'Sprzedaż', purchases: 'Zakupy', filters: 'Filtry', close: 'Zamknij',
    retry: 'Spróbuj ponownie', loading: 'Ładowanie…', unavailable: 'Nie udało się pobrać danych.',
    paid: 'Opłacone', unpaid: 'Nieopłacone', overdue: 'Po terminie', unknown: 'Brak danych',
    thisMonth: 'Ten miesiąc', previousMonth: 'Poprzedni miesiąc', last3Months: 'Ostatnie 3 miesiące', customRange: 'Własny zakres',
    back: 'Wstecz', next: 'Dalej', save: 'Zapisz', confirm: 'Potwierdź', cancel: 'Anuluj', select: 'Wybierz', today: 'Dzisiaj'
  },
  home: {
    greeting: 'Dzień dobry', healthyTitle: 'Wszystko załatwione', healthyBody: 'Nie masz teraz nic do zrobienia.',
    attentionTitle: 'Wymaga Twojej uwagi', attentionBody: 'Sprawdź elementy, które wymagają działania.',
    period: 'Bieżący okres', revenue: 'Przychód', costs: 'Koszty', income: 'Dochód (szac.)',
    payments: 'Najbliższe płatności', noPayments: 'Brak najbliższych płatności'
  },
  invoices: {
    title: 'Faktury', search: 'Szukaj kontrahenta, numeru lub NIP', emptyTitle: 'Brak faktur',
    emptyBody: 'Tutaj pojawią się Twoje faktury.', filteredTitle: 'Brak wyników',
    filteredBody: 'Nie znaleźliśmy faktur pasujących do wybranych filtrów.', clearFilters: 'Wyłącz filtry',
    details: 'Szczegóły faktury', counterparty: 'Kontrahent', number: 'Numer faktury', issueDate: 'Data wystawienia',
    status: 'Status płatności', type: 'Rodzaj', currency: 'Waluta', secondary: 'Dodatkowe informacje', ksef: 'KSeF', source: 'Źródło', category: 'Kategoria'
  },
  settlements: {
    title: 'Rozliczenia', upcoming: 'Najbliższe płatności', history: 'Historia', noPayments: 'Brak płatności w tym okresie',
    period: 'Okres', dueDate: 'Termin płatności', amount: 'Kwota', status: 'Status', historyUnavailable: 'Historia płatności będzie dostępna po udostępnieniu odpowiedniego API.'
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
    vatRate: 'Stawka VAT', vatRateRequired: 'Podaj stawkę VAT wymaganą do zapisania kosztu.'
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

export function formatCurrency(amount: number, currency?: string | null): string {
  if (!Number.isFinite(amount)) return t('common.unknown');
  if (!currency) return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }
  catch { return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }
}

export function paymentLabel(type: string): string { return type.toUpperCase() === 'RYCZALT' ? 'PPE' : type.toUpperCase() === 'VAT' ? 'VAT' : type.toUpperCase() === 'ZUS' ? 'ZUS' : type; }
export function paymentStatusLabel(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === 'PAID' || normalized === 'SETTLED' || normalized === 'MATCHED') return t('common.paid');
  if (normalized === 'OVERDUE') return t('common.overdue');
  return t('common.unpaid');
}

export { strings };
