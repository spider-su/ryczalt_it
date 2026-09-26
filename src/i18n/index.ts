export type UiLocale = 'pl' | 'en';
export const DEFAULT_UI_LOCALE: UiLocale = 'pl';
export const SUPPORTED_UI_LOCALES: UiLocale[] = ['pl', 'en'];
export const intlLocale: Record<UiLocale, string> = {
  pl: 'pl-PL',
  en: 'en-GB'
};

const supplementalTranslations = {
  pl: {
    common: { reset: 'Resetuj', apply: 'Zastosuj' },
    invoices: {
      filterTitle: 'Filtruj faktury',
      reviewFilter: 'Status akceptacji',
      classificationTitle: 'Klasyfikacja',
      invoiceType: 'Rodzaj faktury',
      costCategory: 'Kategoria kosztu',
      classification: {
        plService: 'Usługa krajowa',
        euService: 'Usługa UE',
        plGoods: 'Towary krajowe',
        euGoods: 'Towary UE',
        export: 'Eksport',
        fuel: 'Paliwo',
        vehicleService: 'Usługi samochodowe',
        accounting: 'Księgowość',
        businessService: 'Usługi biznesowe',
        software: 'Oprogramowanie',
        equipment: 'Wyposażenie',
        office: 'Biuro',
        vehicleLeasing: 'Leasing pojazdu',
        vehicle: 'Pojazd'
      }
    },
    settlements: {
      unpaidObligations: 'nieopłacone zobowiązania',
      completedPeriod: 'Wszystkie zobowiązania opłacone',
      documentReview: 'Akceptacja faktur',
      reviewComplete: 'Kompletna',
      reviewNeeded: 'Wymaga sprawdzenia',
      reviewProgress: 'W trakcie'
    }
  },
  en: {
    common: { reset: 'Reset', apply: 'Apply filters' },
    invoices: {
      filterTitle: 'Filter invoices',
      reviewFilter: 'Review status',
      classificationTitle: 'Classification',
      invoiceType: 'Invoice type',
      costCategory: 'Cost category',
      classification: {
        plService: 'PL service',
        euService: 'EU service',
        plGoods: 'PL goods',
        euGoods: 'EU goods',
        export: 'Export',
        fuel: 'Fuel',
        vehicleService: 'Vehicle service',
        accounting: 'Accounting',
        businessService: 'Business services',
        software: 'Software',
        equipment: 'Equipment',
        office: 'Office',
        vehicleLeasing: 'Vehicle leasing',
        vehicle: 'Vehicle'
      }
    },
    settlements: {
      unpaidObligations: 'unpaid obligations',
      completedPeriod: 'All obligations paid',
      documentReview: 'Invoice review',
      reviewComplete: 'Complete',
      reviewNeeded: 'Needs review',
      reviewProgress: 'In progress'
    }
  }
} as const;

const translations = {
  pl: {
    auth: {
      title: 'Investory Accounting',
      subtitle: 'Zaloguj się, aby zobaczyć dane księgowe',
      email: 'E-mail',
      password: 'Hasło',
      confirmPassword: 'Powtórz hasło',
      invitationToken: 'Kod zaproszenia',
      invitationTokenPlaceholder: 'Wklej kod z zaproszenia',
      signIn: 'Zaloguj się',
      activate: 'Aktywuj konto',
      activateInvitation: 'Mam zaproszenie',
      backToSignIn: 'Wróć do logowania',
      signingIn: 'Logowanie…',
      useBiometric: 'Odblokuj biometrią',
      or: 'lub',
      tryDemo: 'Wypróbuj wersję demo',
      demoNote: 'Demo działa lokalnie na przykładowych danych i nie łączy się z serwerem.',
      secureNote: 'Token sesji jest przechowywany w bezpiecznym magazynie urządzenia.',
      errors: {
        invalid_credentials: 'Nieprawidłowy e-mail lub hasło.',
        invalid_response: 'Odpowiedź logowania jest nieprawidłowa.',
        activation_failed: 'Zaproszenie jest nieprawidłowe, wygasło lub zostało już użyte.',
        unavailable: 'Nie udało się połączyć z serwerem. Spróbuj ponownie.',
        unknown: 'Logowanie nie powiodło się. Spróbuj ponownie.'
      }
    },
    app: {
      home: 'Start',
      invoices: 'Faktury',
      settlements: 'Rozliczenia',
      more: 'Więcej'
    },
    startup: { loading: 'Uruchamianie aplikacji…' },
    common: {
      all: 'Wszystkie',
      sales: 'Sprzedaż',
      purchases: 'Zakupy',
      filters: 'Filtry',
      clearSearch: 'Wyczyść wyszukiwanie',
      close: 'Zamknij',
      retry: 'Spróbuj ponownie',
      loading: 'Ładowanie…',
      unavailable: 'Nie udało się pobrać danych.',
      offline: 'Brak połączenia',
      offlineBody: 'Dane już załadowane pozostają dostępne. Operacje finansowe wymagają połączenia.',
      paid: 'Opłacone',
      unpaid: 'Nieopłacone',
      partial: 'Częściowo opłacone',
      notDue: 'Jeszcze niewymagalne',
      overdue: 'Po terminie',
      unknown: 'Brak danych',
      thisMonth: 'Ten miesiąc',
      previousMonth: 'Poprzedni miesiąc',
      last3Months: 'Ostatnie 3 miesiące',
      customRange: 'Własny zakres',
      back: 'Wstecz',
      next: 'Dalej',
      save: 'Zapisz',
      confirm: 'Potwierdź',
      cancel: 'Anuluj',
      select: 'Wybierz',
      today: 'Dzisiaj'
    },
    month: {
      selector: 'Wybrany miesiąc',
      previous: 'Poprzedni miesiąc',
      next: 'Następny miesiąc'
    },
    home: {
      greeting: 'Dzień dobry',
      healthyTitle: 'Wszystko załatwione',
      healthyBody: 'Nie masz teraz nic do zrobienia.',
      settlementPendingTitle: 'Płatności oczekują',
      settlementPendingBody: 'Księgowanie okresu jest kompletne, ale zobowiązania nie są jeszcze opłacone.',
      processingTitle: 'Aktualizujemy dane',
      processingBody: 'Synchronizacja i obliczenia jeszcze trwają.',
      unknownTitle: 'Brak danych',
      unknownBody: 'Nie udało się określić stanu tego miesiąca.',
      attentionTitle: 'Wymaga Twojej uwagi',
      attentionBody: 'Sprawdź elementy, które wymagają działania.',
      informationalTitle: 'Dane są dostępne',
      informationalBody: 'Nie ma teraz niczego, co wymaga Twojego działania.',
      amountUnavailable: 'Kwota niedostępna',
      waitingForData: 'Oczekiwanie na faktury',
      checkIssue: 'Sprawdź',
      checkDocument: 'Sprawdź dokument',
      issueDetails: 'Szczegóły',
      actionUnavailable: 'Ta czynność nie jest jeszcze dostępna w aplikacji.',
      period: 'Bieżący okres',
      revenue: 'Przychód',
      costs: 'Koszty',
      income: 'Dochód (szac.)',
      payments: 'Najbliższe płatności',
      sectionUnavailable: 'Nie udało się pobrać tej sekcji.',
      noPayments: 'Brak płatności w tym okresie',
      obligations: 'Podsumowanie podatków',
      outstanding: 'Do zapłaty',
      actions: 'Działania okresu',
      attention: 'Wymaga uwagi',
      noIssues: 'Brak elementów wymagających działania',
      issueCount: 'rzeczy do sprawdzenia',
      allPaid: 'Wszystkie opłacone',
      ryczalt: 'Ryczałt 12%',
      issueCodes: {
        unsupportedVatRateTitle: 'Stawka VAT wymaga sprawdzenia',
        unsupportedVatRateBody: 'Sprawdź dane dokumentu przed dalszym rozliczeniem.',
        reviewTitle: 'Dane wymagają sprawdzenia',
        reviewBody: 'Sprawdź brakujące lub niejednoznaczne dane dokumentu.',
        setupTitle: 'Uzupełnij ustawienia',
        setupBody: 'Uzupełnij ustawienia wymagane do dalszego rozliczenia.',
        unknownTitle: 'Nie można określić szczegółów',
        unknownBody: 'Dostępne dane nie pozwalają opisać tego elementu.'
      }
    },
    invoices: {
      title: 'Faktury',
      search: 'Szukaj kontrahenta, numeru lub NIP',
      emptyTitle: 'Brak faktur',
      emptyBody: 'Tutaj pojawią się Twoje faktury.',
      filteredTitle: 'Brak wyników',
      filteredBody: 'Nie znaleźliśmy faktur pasujących do wybranych filtrów.',
      clearFilters: 'Wyłącz filtry',
      details: 'Szczegóły faktury',
      selectedMonth: 'Wybrany miesiąc',
      previousMonthHeading: 'Poprzedni miesiąc',
      last3MonthsHeading: 'Ostatnie 3 miesiące',
      allInSelectedMonth: 'Wszystkie w wybranym miesiącu',
      counterparty: 'Kontrahent',
      number: 'Numer faktury',
      issueDate: 'Data wystawienia',
      status: 'Status płatności',
      type: 'Rodzaj',
      currency: 'Waluta',
      secondary: 'Dodatkowe informacje',
      ksef: 'KSeF',
      source: 'Źródło',
      category: 'Kategoria',
      processing: 'Przetwarzanie',
      review: 'Akceptacja',
      approval: {
        approved: 'Zatwierdzono',
        needsReview: 'Wymaga akceptacji',
        unknown: 'Status akceptacji nieznany'
      },
      moreOptions: 'Więcej opcji faktury',
      correction: 'Korekta',
      manualPaid: 'Potwierdź opłacenie ręcznie',
      manualPaidAlready: 'Już opłacona',
      removeManualPaid: 'Usuń ręczne potwierdzenie',
      manualPaidError: 'Nie udało się zaktualizować statusu płatności.'
    },
    settlements: {
      title: 'Rozliczenia',
      upcoming: 'Najbliższe płatności',
      history: 'Historia',
      noPayments: 'Brak nadchodzących płatności w tym okresie',
      noHistory: 'Brak zakończonych płatności w tym okresie',
      historyError: 'Nie udało się pobrać historii rozliczeń.',
      period: 'Okres',
      dueDate: 'Termin płatności',
      dueDateUnavailable: '—',
      amount: 'Kwota',
      paidAmount: 'Opłacono',
      remaining: 'Pozostało',
      remainingShort: 'pozostało',
      status: 'Status',
      statusUnavailable: 'Status niedostępny',
      accountingStatus: 'Status rozliczenia',
      periodStatus: 'Status okresu',
      completeness: 'Kompletność księgowania',
      actions: 'Dostępne działania',
      reconciliation: 'Uzgodnienie danych',
      markPaidManually: 'Oznacz jako opłacone ręcznie',
      confirmManualPaid: 'Potwierdź płatność',
      manualPaidConfirmation: 'Oznaczy to zobowiązanie jako opłacone ręcznie z dzisiejszą datą.',
      manualPaidFailure: 'Nie udało się zaktualizować płatności. Spróbuj ponownie.',
      manualPaidSuccess: 'Płatność oznaczona jako opłacona.',
      manualPaidUncertain: 'Nie udało się potwierdzić wyniku płatności.',
      manualPaidRefresh: 'Odświeżamy dane, aby potwierdzić aktualny status.'
    },
    more: {
      title: 'Więcej',
      company: 'Dane firmy',
      counterparties: 'Kontrahenci',
      systems: 'Połączone systemy',
      health: 'Stan księgowości',
      healthUnavailable: 'Nie udało się pobrać stanu księgowości.',
      settings: 'Ustawienia',
      notifications: 'Powiadomienia',
      reports: 'Eksporty i raporty',
      help: 'Pomoc i kontakt',
      comingSoon: 'Wkrótce',
      signOut: 'Wyloguj się',
      connected: 'Połączono',
      notConnected: 'Nie połączono',
      unknownStatus: 'Brak danych',
      periodStatus: 'Status okresu',
      completeness: 'Kompletność',
      reconciliation: 'Uzgodnienie',
      demoProfile: 'Profil demonstracyjny',
      demoDescription: 'Przykładowe dane lokalne. Żadne zmiany nie są wysyłane na serwer.'
    },
    counterparties: {
      title: 'Kontrahenci',
      detail: 'Szczegóły kontrahenta',
      searchPlaceholder: 'Szukaj nazwy lub NIP',
      searchEmpty: 'Nie znaleziono kontrahentów',
      openDetails: 'Otwórz szczegóły kontrahenta',
      empty: 'Brak kontrahentów.',
      taxIdUnavailable: 'Brak identyfikatora podatkowego',
      nip: 'NIP',
      taxId: 'Identyfikator podatkowy',
      invoiceCount: {
        one: 'faktura',
        few: 'faktury',
        many: 'faktur',
        other: 'faktur'
      },
      invoiceCountUnavailable: 'Liczba faktur niedostępna',
      error: 'Nie udało się pobrać kontrahentów.',
      historyError: 'Nie udało się pobrać historii faktur.',
      noInvoices: 'Brak faktur dla tego kontrahenta.',
      invoices: 'faktur',
      rules: 'Zasady księgowania',
      rulesUnavailable: 'Nie udało się pobrać zasad.',
      noRules: 'Brak zapisanych zasad dla tego kontrahenta.',
      category: 'Kategoria',
      autoApprove: 'Automatyczna akceptacja',
      enabled: 'Włączona',
      disabled: 'Wyłączona',
      paymentVerification: 'Weryfikacja płatności',
      history: 'Historia faktur'
    },
    settings: {
      title: 'Ustawienia',
      language: 'Język',
      languageDescription: 'Wybierz język aplikacji',
      polish: 'Polski',
      english: 'Angielski',
      appearance: 'Wygląd',
      appearanceDescription: 'Wybierz sposób wyświetlania aplikacji',
      light: 'Jasny',
      dark: 'Ciemny',
      system: 'Systemowy',
      systemDescription: 'Systemowy — zgodny z ustawieniami urządzenia'
    },
    actions: {
      title: 'Dodaj fakturę',
      invoice: 'Wystaw fakturę',
      cost: 'Dodaj koszt',
      income: 'Dodaj przychód',
      manualInvoice: 'Wprowadź fakturę ręcznie',
      manualInvoiceHint: 'Wpisz dane faktury kosztowej bez pliku',
      importInvoice: 'Importuj fakturę',
      importInvoiceHint: 'Wczytaj PDF lub zdjęcie i rozpoznaj dane',
      close: 'Zamknij',
      onlyAvailable: 'Dostępne akcje'
    },
    invoice: {
      title: 'Wystaw fakturę',
      client: 'Klient',
      chooseClient: 'Wybierz klienta',
      clientSearch: 'Szukaj po nazwie lub NIP',
      newClient: 'Nowy klient',
      item: 'Pozycja',
      description: 'Opis usługi lub produktu',
      quantity: 'Ilość',
      unitPrice: 'Cena jednostkowa',
      currency: 'Waluta',
      issueDate: 'Data wystawienia',
      dueDate: 'Termin płatności',
      review: 'Sprawdź fakturę',
      total: 'Razem',
      issue: 'Wystaw fakturę',
      unavailable: 'Wystawianie faktur nie jest jeszcze obsługiwane przez backend.',
      clientRequired: 'Wybierz klienta.',
      descriptionRequired: 'Podaj opis pozycji.',
      amountRequired: 'Podaj poprawną kwotę.',
      dateRequired: 'Podaj datę wystawienia.',
      dueDateRequired: 'Podaj termin płatności.'
    },
    cost: {
      title: 'Dodaj koszt',
      chooseDocument: 'Wybierz dokument',
      chooseDocumentHint: 'PDF lub zdjęcie faktury',
      recognize: 'Odczytaj dokument',
      confirm: 'Dodaj koszt',
      recognized: 'Odczytane dane',
      noDocument: 'Wybierz dokument, aby kontynuować.',
      saved: 'Dokument zapisany do weryfikacji.',
      duplicate: 'Ta faktura jest już w Twoich dokumentach.',
      failed: 'Nie udało się odczytać dokumentu. Sprawdź plik i spróbuj ponownie.',
      unsupportedDirection: 'Wybrany dokument nie jest dokumentem zakupu.',
      vatTreatment: 'Sposób rozliczenia VAT',
      domesticPurchase: 'Zakup krajowy',
      vatRate: 'Stawka VAT',
      vatRateRequired: 'Podaj stawkę VAT wymaganą do zapisania kosztu.',
      accountingDecisionRequired: 'Wybierz sposób rozliczenia VAT, aby kontynuować.',
      errors: {
        validation_required: 'Dokument wymaga dodatkowych danych do zapisania.',
        authentication_required: 'Zaloguj się ponownie, aby kontynuować.',
        authorization_failed: 'Brak uprawnień do wykonania tej operacji.',
        unavailable: 'Nie udało się połączyć z serwerem. Spróbuj ponownie.',
        backend_required: 'Ten dokument wymaga decyzji księgowej dostępnej w panelu webowym.',
        unknown_error: 'Nie udało się zapisać dokumentu. Spróbuj ponownie.'
      },
      treatments: {
        domestic: 'Zakup krajowy',
        eu: 'Import usług z UE',
        nonEu: 'Import usług spoza UE',
        unknown: 'Opcja wymaga sprawdzenia w panelu webowym'
      },
      country: 'Kraj kontrahenta',
      backendRequired: 'Ten dokument wymaga decyzji księgowej dostępnej w panelu webowym.'
    },
    income: {
      title: 'Dodaj przychód',
      amount: 'Kwota',
      date: 'Data',
      description: 'Opis lub źródło',
      submit: 'Dodaj przychód',
      amountRequired: 'Podaj poprawną kwotę.',
      dateRequired: 'Podaj datę.',
      descriptionRequired: 'Podaj opis lub źródło.',
      unavailable: 'Ręczne dodawanie przychodu nie jest jeszcze obsługiwane przez backend.'
    },
    backend: {
      actionUnavailable: 'Ta czynność nie jest jeszcze dostępna.',
      requestFailed: 'Nie udało się wykonać operacji. Sprawdź połączenie i spróbuj ponownie.'
    },
    automation: {
      title: 'Automatyzacja',
      enabled: 'Automatyczne zatwierdzanie',
      explanation: 'Pozwól Investory automatycznie przetwarzać dokumenty spełniające wymagania backendu i Twoje ustawienia.',
      maxAmount: 'Maksymalna kwota',
      maxAmountPlaceholder: '0,00',
      maxAmountHint: 'Kwota pozostaje dokładna i jest zapisywana jako wartość ustawień.',
      categories: 'Zaufane kategorie',
      categoriesPlaceholder: 'np. ACCOUNTING_SERVICE, FUTURE_CATEGORY',
      categoriesHint: 'Wpisz kanoniczne wartości oddzielone przecinkami. Nie zmieniaj ich na etykiety językowe.',
      save: 'Zapisz ustawienia',
      saving: 'Zapisywanie…',
      errors: {
        load: 'Nie udało się pobrać ustawień automatyzacji.',
        save: 'Nie udało się zapisać ustawień. Spróbuj ponownie.',
        refresh: 'Ustawienia zapisano, ale nie udało się potwierdzić ich aktualnego stanu.',
        network: 'Nie udało się połączyć z serwerem.',
        timeout: 'Serwer nie odpowiedział na czas.',
        authorization: 'Brak uprawnień do zmiany tych ustawień.',
        validation: 'Sprawdź kwotę i kategorie.',
        response: 'Odpowiedź serwera jest nieprawidłowa.'
      }
    },
    notifications: {
      title: 'Powiadomienia',
      description: 'Włącz spokojne przypomnienia o zbliżających się terminach płatności.',
      paymentReminders: 'Przypomnienia o płatnościach',
      paymentRemindersHint: 'Przypomnienia są przechowywane tylko na tym urządzeniu.',
      leadTime: 'Przypomnij',
      days1: '1 dzień wcześniej',
      days3: '3 dni wcześniej',
      days7: '7 dni wcześniej',
      permissionRevoked: 'Powiadomienia są wyłączone w ustawieniach urządzenia.',
      loadError: 'Nie udało się pobrać ustawień powiadomień.',
      error: 'Nie udało się zapisać ustawień lub włączyć powiadomień.'
    },
    payments: {
      types: { ppe: 'Ryczałt', vat: 'VAT', zus: 'ZUS', unknown: 'Brak danych' },
      status: {
        paid: 'Opłacone',
        overdue: 'Po terminie',
        partial: 'Częściowo opłacone',
        unpaid: 'Nieopłacone',
        notDue: 'Jeszcze niewymagalne',
        unknown: 'Brak danych'
      }
    },
    status: {
      unknown: 'Brak danych',
      ksefConnected: 'Połączono',
      ksefNotConfigured: 'Nie skonfigurowano',
      bankMatched: 'Transakcje dopasowane',
      bankUnmatched: 'Transakcje wymagają sprawdzenia',
      bankPending: 'Import w toku',
      bankFailed: 'Import nie powiódł się',
      bankNoImport: 'Brak importu',
      reconciliationHealthy: 'Zgodne',
      reconciliationMismatch: 'Pozycje wymagają sprawdzenia',
      reconciliationMissingEvidence: 'Brakuje dokumentów',
      filingReady: 'Gotowe',
      filingNeedsAttention: 'Wymaga uwagi',
      filingPending: 'W przygotowaniu',
      jpkGenerated: 'Wygenerowano',
      jpkSubmitted: 'Wysłano',
      jpkInvalid: 'Nieprawidłowe',
      jpkMissing: 'Nie wygenerowano',
      upoReceived: 'Otrzymano',
      upoRejected: 'Odrzucono',
      upoMissing: 'Nie otrzymano',
      documentReceived: 'Otrzymano',
      documentParsed: 'Przetworzono',
      documentImported: 'Zaimportowano',
      documentFailed: 'Przetwarzanie nie powiodło się',
      documentReviewRequired: 'Wymaga weryfikacji',
      documentReviewed: 'Zweryfikowano',
      lifecycle: {
        open: 'W przygotowaniu',
        sources_incomplete: 'Brakuje danych',
        ready_for_review: 'Gotowe do sprawdzenia',
        issues: 'Wymaga uwagi',
        confirmed: 'Potwierdzone',
        filed: 'Złożone',
        paid: 'Opłacone',
        settled: 'Rozliczone',
        locked: 'Zamknięte'
      }
    }
  },
  en: {
    auth: {
      title: 'Investory Accounting',
      subtitle: 'Sign in to view your accounting data',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      invitationToken: 'Invitation code',
      invitationTokenPlaceholder: 'Paste the code from your invitation',
      signIn: 'Sign in',
      activate: 'Activate account',
      activateInvitation: 'I have an invitation',
      backToSignIn: 'Back to sign in',
      signingIn: 'Signing in…',
      useBiometric: 'Unlock with biometrics',
      or: 'or',
      tryDemo: 'Try the demo',
      demoNote: 'The demo runs locally with sample data and does not connect to the server.',
      secureNote: 'Your session token is stored securely on this device.',
      errors: {
        invalid_credentials: 'The email or password is incorrect.',
        invalid_response: 'The sign-in response was invalid.',
        activation_failed: 'The invitation is invalid, expired, or already used.',
        unavailable: 'We could not connect to the server. Try again.',
        unknown: 'Sign-in failed. Try again.'
      }
    },
    app: {
      home: 'Home',
      invoices: 'Invoices',
      settlements: 'Settlements',
      more: 'More'
    },
    startup: { loading: 'Starting the app…' },
    common: {
      all: 'All',
      sales: 'Sales',
      purchases: 'Purchases',
      filters: 'Filters',
      clearSearch: 'Clear search',
      close: 'Close',
      retry: 'Try again',
      loading: 'Loading…',
      unavailable: 'We could not load the data.',
      offline: 'No connection',
      offlineBody: 'Already loaded data remains available. Financial actions require a connection.',
      paid: 'Paid',
      unpaid: 'Unpaid',
      partial: 'Partially paid',
      notDue: 'Not due yet',
      overdue: 'Overdue',
      unknown: 'No data',
      thisMonth: 'This month',
      previousMonth: 'Previous month',
      last3Months: 'Last 3 months',
      customRange: 'Custom range',
      back: 'Back',
      next: 'Next',
      save: 'Save',
      confirm: 'Confirm',
      cancel: 'Cancel',
      select: 'Select',
      today: 'Today'
    },
    month: {
      selector: 'Selected month',
      previous: 'Previous month',
      next: 'Next month'
    },
    home: {
      greeting: 'Good morning',
      healthyTitle: 'All done',
      healthyBody: 'You have nothing to do right now.',
      settlementPendingTitle: 'Payments pending',
      settlementPendingBody: 'Accounting for this period is complete, but the obligations have not been paid yet.',
      processingTitle: 'Updating your data',
      processingBody: 'Synchronisation and calculations are still in progress.',
      unknownTitle: 'No data',
      unknownBody: 'We could not determine this month’s status.',
      attentionTitle: 'Needs your attention',
      attentionBody: 'Review the items that need action.',
      informationalTitle: 'Information available',
      informationalBody: 'There is nothing you need to do right now.',
      amountUnavailable: 'Amount unavailable',
      waitingForData: 'Waiting for invoices',
      checkIssue: 'Check',
      checkDocument: 'Check invoice',
      issueDetails: 'Details',
      actionUnavailable: 'This action is not available in the app yet.',
      period: 'Current period',
      revenue: 'Revenue',
      costs: 'Costs',
      income: 'Estimated income',
      payments: 'Upcoming payments',
      sectionUnavailable: 'This section could not be loaded.',
      noPayments: 'No payments in this period',
      obligations: 'Tax summary',
      outstanding: 'Outstanding',
      actions: 'Period actions',
      attention: 'Needs attention',
      noIssues: 'Nothing needs your attention',
      issueCount: 'items to check',
      allPaid: 'All paid',
      ryczalt: 'Flat-rate tax 12%',
      issueCodes: {
        unsupportedVatRateTitle: 'VAT rate needs review',
        unsupportedVatRateBody: 'Check the invoice details before continuing the accounting process.',
        reviewTitle: 'Data needs review',
        reviewBody: 'Check missing or ambiguous data.',
        setupTitle: 'Complete your settings',
        setupBody: 'Complete the settings required to continue accounting.',
        unknownTitle: 'Details unavailable',
        unknownBody: 'The available data does not describe this item.'
      }
    },
    invoices: {
      title: 'Invoices',
      search: 'Search counterparty, number or NIP',
      emptyTitle: 'No invoices',
      emptyBody: 'Your invoices will appear here.',
      filteredTitle: 'No results',
      filteredBody: 'No invoices match the selected filters.',
      clearFilters: 'Clear filters',
      details: 'Invoice details',
      selectedMonth: 'Selected month',
      previousMonthHeading: 'Previous month',
      last3MonthsHeading: 'Last 3 months',
      allInSelectedMonth: 'All in the selected month',
      counterparty: 'Counterparty',
      number: 'Invoice number',
      issueDate: 'Issue date',
      status: 'Payment status',
      type: 'Type',
      currency: 'Currency',
      secondary: 'Additional information',
      ksef: 'KSeF',
      source: 'Source',
      category: 'Category',
      processing: 'Processing',
      review: 'Approval',
      approval: {
        approved: 'Approved',
        needsReview: 'Needs approval',
        unknown: 'Unknown approval status'
      },
      moreOptions: 'More invoice options',
      paymentVerification: 'Payment verification',
      correction: 'Correction',
      manualPaid: 'Mark as paid manually',
      manualPaidAlready: 'Already paid',
      removeManualPaid: 'Remove manual payment confirmation',
      manualPaidError: 'We could not update the payment status.'
    },
    settlements: {
      title: 'Settlements',
      upcoming: 'Upcoming payments',
      history: 'History',
      noPayments: 'No upcoming payments for this period',
      noHistory: 'No completed payments in this period',
      historyError: 'We could not load settlement history.',
      period: 'Period',
      dueDate: 'Due date',
      dueDateUnavailable: '—',
      amount: 'Amount',
      paidAmount: 'Paid',
      remaining: 'Remaining',
      remainingShort: 'remaining',
      status: 'Status',
      statusUnavailable: 'Status unavailable',
      accountingStatus: 'Accounting status',
      periodStatus: 'Period status',
      completeness: 'Accounting completeness',
      actions: 'Available actions',
      reconciliation: 'Data reconciliation',
      markPaidManually: 'Mark paid manually',
      confirmManualPaid: 'Confirm payment',
      manualPaidConfirmation: 'This records the obligation as manually paid using today’s date.',
      manualPaidFailure: 'Could not update the payment. Try again.',
      manualPaidSuccess: 'Payment marked as paid.',
      manualPaidUncertain: 'We could not confirm the payment result.',
      manualPaidRefresh: 'Refreshing data to confirm the current status.'
    },
    more: {
      title: 'More',
      company: 'Company details',
      counterparties: 'Counterparties',
      systems: 'Connected systems',
      health: 'Accounting health',
      healthUnavailable: 'Could not load accounting health.',
      settings: 'Settings',
      notifications: 'Notifications',
      reports: 'Exports and reports',
      help: 'Help and contact',
      comingSoon: 'Coming soon',
      signOut: 'Sign out',
      connected: 'Connected',
      notConnected: 'Not connected',
      unknownStatus: 'No data',
      periodStatus: 'Period status',
      completeness: 'Completeness',
      reconciliation: 'Reconciliation',
      demoProfile: 'Demo profile',
      demoDescription: 'Local sample data. Changes are not sent to the server.'
    },
    counterparties: {
      title: 'Counterparties',
      detail: 'Counterparty details',
      searchPlaceholder: 'Search name or tax ID',
      searchEmpty: 'No counterparties found',
      openDetails: 'Open counterparty details',
      empty: 'No counterparties.',
      taxIdUnavailable: 'Tax ID unavailable',
      nip: 'NIP',
      taxId: 'Tax ID',
      invoiceCount: {
        one: 'invoice',
        few: 'invoices',
        many: 'invoices',
        other: 'invoices'
      },
      invoiceCountUnavailable: 'Invoice count unavailable',
      error: 'We could not load counterparties.',
      historyError: 'We could not load invoice history.',
      noInvoices: 'No invoices for this counterparty.',
      invoices: 'invoices',
      rules: 'Accounting treatment',
      rulesUnavailable: 'Could not load accounting rules.',
      noRules: 'No saved rules for this counterparty.',
      category: 'Category',
      autoApprove: 'Automatic approval',
      enabled: 'Enabled',
      disabled: 'Disabled',
      paymentVerification: 'Payment verification',
      history: 'Invoice history'
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      languageDescription: 'Choose the app language',
      polish: 'Polski',
      english: 'English',
      appearance: 'Appearance',
      appearanceDescription: 'Choose how the app looks',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      systemDescription: 'System follows your device appearance'
    },
    actions: {
      title: 'Add invoice',
      invoice: 'Issue an invoice',
      cost: 'Add a cost',
      income: 'Add income',
      manualInvoice: 'Enter invoice manually',
      manualInvoiceHint: 'Add supplier invoice details without a file',
      importInvoice: 'Import invoice',
      importInvoiceHint: 'Read an existing PDF or invoice photo',
      close: 'Close',
      onlyAvailable: 'Available actions'
    },
    invoice: {
      title: 'Issue an invoice',
      client: 'Client',
      chooseClient: 'Choose a client',
      clientSearch: 'Search by name or NIP',
      newClient: 'New client',
      item: 'Item',
      description: 'Service or product description',
      quantity: 'Quantity',
      unitPrice: 'Unit price',
      currency: 'Currency',
      issueDate: 'Issue date',
      dueDate: 'Due date',
      review: 'Review invoice',
      total: 'Total',
      issue: 'Issue invoice',
      unavailable: 'Invoice issuing is not yet supported by the backend.',
      clientRequired: 'Choose a client.',
      descriptionRequired: 'Enter an item description.',
      amountRequired: 'Enter a valid amount.',
      dateRequired: 'Enter the issue date.',
      dueDateRequired: 'Enter the due date.'
    },
    cost: {
      title: 'Add a cost',
      chooseDocument: 'Choose a document',
      chooseDocumentHint: 'PDF or invoice photo',
      recognize: 'Read document',
      confirm: 'Add cost',
      recognized: 'Recognised data',
      noDocument: 'Choose a document to continue.',
      saved: 'Document saved for review.',
      duplicate: 'This invoice is already in your documents.',
      failed: 'We could not read the document. Check the file and try again.',
      unsupportedDirection: 'The selected document is not a purchase document.',
      vatTreatment: 'VAT treatment',
      domesticPurchase: 'Domestic purchase',
      vatRate: 'VAT rate',
      vatRateRequired: 'Enter the VAT rate required to save the cost.',
      accountingDecisionRequired: 'Choose a VAT treatment to continue.',
      errors: {
        validation_required: 'This document needs more information before it can be saved.',
        authentication_required: 'Sign in again to continue.',
        authorization_failed: 'You are not authorized to perform this operation.',
        unavailable: 'We could not connect to the server. Try again.',
        backend_required: 'This document requires an accounting decision in the web panel.',
        unknown_error: 'We could not save the document. Try again.'
      },
      treatments: {
        domestic: 'Domestic purchase',
        eu: 'Import of services from the EU',
        nonEu: 'Import of services from outside the EU',
        unknown: 'This option requires review in the web panel'
      },
      country: 'Counterparty country',
      backendRequired: 'This document requires an accounting decision in the web panel.'
    },
    income: {
      title: 'Add income',
      amount: 'Amount',
      date: 'Date',
      description: 'Description or source',
      submit: 'Add income',
      amountRequired: 'Enter a valid amount.',
      dateRequired: 'Enter the date.',
      descriptionRequired: 'Enter a description or source.',
      unavailable: 'Manual income is not yet supported by the backend.'
    },
    backend: {
      actionUnavailable: 'This action is not available yet.',
      requestFailed: 'The operation failed. Check your connection and try again.'
    },
    automation: {
      title: 'Automation',
      enabled: 'Automatic approval',
      explanation: 'Let Investory automatically process documents that meet backend requirements and your settings.',
      maxAmount: 'Maximum amount',
      maxAmountPlaceholder: '0.00',
      maxAmountHint: 'The amount remains exact and is saved as configuration data.',
      categories: 'Trusted categories',
      categoriesPlaceholder: 'e.g. ACCOUNTING_SERVICE, FUTURE_CATEGORY',
      categoriesHint: 'Enter canonical values separated by commas. Do not replace them with translated labels.',
      save: 'Save settings',
      saving: 'Saving…',
      errors: {
        load: 'We could not load automation settings.',
        save: 'We could not save the settings. Try again.',
        refresh: 'The settings were saved, but we could not confirm their current state.',
        network: 'We could not connect to the server.',
        timeout: 'The server did not respond in time.',
        authorization: 'You are not allowed to change these settings.',
        validation: 'Check the amount and categories.',
        response: 'The server response was invalid.'
      }
    },
    notifications: {
      title: 'Notifications',
      description: 'Turn on quiet reminders for approaching payment deadlines.',
      paymentReminders: 'Payment reminders',
      paymentRemindersHint: 'Reminders are stored only on this device.',
      leadTime: 'Remind me',
      days1: '1 day before',
      days3: '3 days before',
      days7: '7 days before',
      permissionRevoked: 'Notifications are disabled in the device settings.',
      loadError: 'We could not load notification settings.',
      error: 'We could not save the settings or enable notifications.'
    },
    payments: {
      types: { ppe: 'Ryczałt', vat: 'VAT', zus: 'ZUS', unknown: 'No data' },
      status: {
        paid: 'Paid',
        overdue: 'Overdue',
        partial: 'Partially paid',
        unpaid: 'Unpaid',
        notDue: 'Not due yet',
        unknown: 'No data'
      }
    },
    status: {
      unknown: 'No data',
      ksefConnected: 'Connected',
      ksefNotConfigured: 'Not configured',
      bankMatched: 'All transactions matched',
      bankUnmatched: 'Transactions need review',
      bankPending: 'Import in progress',
      bankFailed: 'Import failed',
      bankNoImport: 'No import',
      reconciliationHealthy: 'Matches',
      reconciliationMismatch: 'Items need review',
      reconciliationMissingEvidence: 'Documents are missing',
      filingReady: 'Ready',
      filingNeedsAttention: 'Needs attention',
      filingPending: 'In preparation',
      jpkGenerated: 'Generated',
      jpkSubmitted: 'Submitted',
      jpkInvalid: 'Invalid',
      jpkMissing: 'Not generated',
      upoReceived: 'Received',
      upoRejected: 'Rejected',
      upoMissing: 'Not received',
      documentReceived: 'Received',
      documentParsed: 'Processed',
      documentImported: 'Imported',
      documentFailed: 'Processing failed',
      documentReviewRequired: 'Needs review',
      documentReviewed: 'Reviewed',
      lifecycle: {
        open: 'In preparation',
        sources_incomplete: 'Data missing',
        ready_for_review: 'Ready for review',
        issues: 'Needs attention',
        confirmed: 'Confirmed',
        filed: 'Filed',
        paid: 'Paid',
        settled: 'Settled',
        locked: 'Closed'
      }
    }
  }
} as const;

let activeLocale: UiLocale = DEFAULT_UI_LOCALE;
export function setActiveLocale(value: UiLocale): void {
  activeLocale = value;
}
export function getActiveLocale(): UiLocale {
  return activeLocale;
}
export function toIntlLocale(value: UiLocale = activeLocale): string {
  return intlLocale[value];
}
export function t(path: string, valueLocale: UiLocale = activeLocale): string {
  const read = (source: unknown) => path.split('.').reduce<unknown>((current, key) => (current as Record<string, unknown> | undefined)?.[key], source);
  const supplemental = read(supplementalTranslations[valueLocale]);
  if (typeof supplemental === 'string') return supplemental;
  const value = read(translationsByLocale[valueLocale]);
  return typeof value === 'string' ? value : path;
}
export function formatDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }
): string {
  if (!value) return t('common.unknown');
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(toIntlLocale(), options).format(date);
}
export function formatMonth(value: string | null | undefined): string {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return t('common.unknown');
  const date = new Date(`${value}-01T00:00:00`);
  const [year, month] = value.split('-').map(Number);
  return Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() + 1 !== month
    ? t('common.unknown')
    : new Intl.DateTimeFormat(toIntlLocale(), {
        month: 'long',
        year: 'numeric'
      }).format(date);
}
function exactDecimalParts(amount: string): { negative: boolean; integer: string; fraction: string } | null {
  const value = amount.trim();
  const match = value.match(/^(?<sign>-)?(?<integer>\d+)(?:\.(?<fraction>\d+))?$/);
  if (!match?.groups?.integer) return null;
  const integer = match.groups.integer.replace(/^0+(?=\d)/, '');
  const rawFraction = match.groups.fraction ?? '';
  const significantFraction = rawFraction.replace(/0+$/, '');
  return {
    negative: Boolean(match.groups.sign) && (/[1-9]/.test(integer) || /[1-9]/.test(rawFraction)),
    integer,
    fraction: significantFraction
  };
}

function formatExactDecimal(amount: string, currency?: string | null): string | null {
  const parts = exactDecimalParts(amount);
  if (!parts) return null;
  const locale = toIntlLocale();
  // Mobile accounting screens intentionally show whole currency units. Keep the
  // wire/domain amount exact; only omit its fractional part at presentation time.
  const displayDigits = 0;
  const formatter = currency
    ? new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: displayDigits,
        maximumFractionDigits: displayDigits
      })
    : new Intl.NumberFormat(locale, {
        minimumFractionDigits: displayDigits,
        maximumFractionDigits: displayDigits
      });
  const groupedInteger = BigInt(parts.integer)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  // Hermes on Android does not consistently support BigInt values in
  // Intl.NumberFormat.formatToParts. Use a small numeric sentinel only to
  // obtain the locale's currency/sign layout, then replace its integer part
  // with the exact string calculated above.
  const template = formatter.formatToParts(parts.negative ? -1 : 1);
  return template.map((part) => (part.type === 'integer' ? groupedInteger : part.value)).join('');
}

export function formatCurrency(amount: string | null | undefined, currency?: string | null): string {
  if (amount == null) return t('home.amountUnavailable');
  try {
    return formatExactDecimal(amount, currency) ?? t('common.unknown');
  } catch {
    return t('common.unknown');
  }
}
export type PaymentLabelKey = 'ppe' | 'vat' | 'zus' | 'unknown';
export function paymentLabelKey(type: string): PaymentLabelKey {
  const normalized = type.toUpperCase();
  return normalized === 'RYCZALT' ? 'ppe' : normalized === 'VAT' ? 'vat' : normalized === 'ZUS' ? 'zus' : 'unknown';
}
export function paymentLabel(type: string): string {
  return t(`payments.types.${paymentLabelKey(type)}`);
}
export type PaymentStatusKey = 'paid' | 'overdue' | 'partial' | 'unpaid' | 'notDue' | 'unknown';
export function paymentStatusKey(status: string): PaymentStatusKey {
  const normalized = status.toUpperCase();
  if (['PAID', 'OVERPAID'].includes(normalized)) return 'paid';
  if (normalized === 'OVERDUE') return 'overdue';
  if (['PARTIALLY_PAID', 'PARTIAL'].includes(normalized)) return 'partial';
  if (['OPEN', 'DUE'].includes(normalized)) return 'unpaid';
  if (normalized === 'NOT_DUE') return 'notDue';
  return 'unknown';
}
export function paymentStatusLabel(status: string): string {
  return t(`payments.status.${paymentStatusKey(status)}`);
}
export type InvoicePaymentStatusKey = 'matched' | 'manuallyConfirmed' | 'partiallyMatched' | 'unmatched' | 'notRequired' | 'unknown';
export function invoicePaymentStatusKey(status: string | null | undefined): InvoicePaymentStatusKey {
  switch (status?.trim().toUpperCase()) {
    case 'MATCHED':
      return 'matched';
    case 'MANUALLY_CONFIRMED':
      return 'manuallyConfirmed';
    case 'PARTIALLY_MATCHED':
      return 'partiallyMatched';
    case 'UNMATCHED':
      return 'unmatched';
    case 'NOT_REQUIRED':
      return 'notRequired';
    default:
      return 'unknown';
  }
}
export function invoicePaymentStatusLabel(status: string | null | undefined): string {
  return t(`invoices.paymentStatuses.${invoicePaymentStatusKey(status)}`);
}
export function paymentVerificationLabel(policy: string | null | undefined): string {
  switch (policy?.trim().toUpperCase()) {
    case 'REQUIRED':
      return t('invoices.paymentVerificationRequired');
    case 'NOT_REQUIRED':
      return t('invoices.paymentVerificationNotRequired');
    default:
      return t('common.unknown');
  }
}
export function periodStatusLabel(status: string | null | undefined): string {
  return knownStatusLabel('status.period', status);
}
export function completenessStatusLabel(status: string | null | undefined): string {
  return knownStatusLabel('status.completeness', status);
}
export function periodActionLabel(action: string): string {
  return knownStatusLabel('status.action', action);
}
export function reconciliationStateLabel(state: string | null | undefined): string {
  const labels: Record<string, string> = {
    healthy: 'status.reconciliationHealthy',
    mismatch: 'status.reconciliationMismatch',
    missing_evidence: 'status.reconciliationMissingEvidence'
  };
  return state ? t(labels[state.trim().toLowerCase()] ?? 'status.unknown') : t('status.unknown');
}
function knownStatusLabel(prefix: string, value: string | null | undefined): string {
  if (!value) return t('common.unknown');
  const path = `${prefix}.${value.trim().toLowerCase()}`;
  const label = t(path);
  return label === path ? t('common.unknown') : label;
}
export function invoiceSourceLabel(sourceType: string | null | undefined, sourceReference?: string | null): string {
  const normalized = sourceType?.trim().toUpperCase();
  if (normalized === 'KSEF') return [t('invoices.sourceKsef'), sourceReference?.trim()].filter(Boolean).join(' · ');
  if (normalized === 'UPLOAD') return t('invoices.sourceUpload');
  return t('common.unknown');
}
export function costInputLabel(field: string, fallback?: string | null): string {
  if (field === 'vatTreatment' || field === 'classification') return t('cost.vatTreatment');
  if (field === 'vatRate') return t('cost.vatRate');
  if (field === 'counterpartyCountry') return t('cost.country');
  return fallback || t('common.unknown');
}
export function costOptionLabel(value: string, fallback?: string | null): string {
  if (value === 'DOMESTIC_PURCHASE') return t('cost.treatments.domestic');
  if (value === 'IMPORT_OF_SERVICES_EU') return t('cost.treatments.eu');
  if (value === 'IMPORT_OF_SERVICES_NON_EU') return t('cost.treatments.nonEu');
  return fallback || t('cost.treatments.unknown');
}
export const translationsByLocale = {
  pl: {
    ...translations.pl,
    settings: {
      ...translations.pl.settings,
      biometric: 'Logowanie biometrią',
      biometricEnabled: 'Biometria włączona',
      biometricDisabled: 'Włącz biometrię',
      biometricDescription: 'Odblokowuj aplikację odciskiem palca lub Face ID.'
    },
    invoices: {
      ...translations.pl.invoices,
      search: 'Szukaj kontrahenta lub numeru faktury',
      paymentVerification: 'Weryfikacja płatności',
      paymentVerificationRequired: 'Wymagana',
      paymentVerificationNotRequired: 'Niewymagana',
      paymentNotRequiredShort: 'Niewymagana',
      sourceKsef: 'KSeF',
      sourceUpload: 'Dokument przesłany',
      paymentStatuses: {
        matched: 'Opłacone',
        manuallyConfirmed: 'Opłacone ręcznie',
        partiallyMatched: 'Częściowo opłacone',
        unmatched: 'Nieopłacone',
        notRequired: 'Weryfikacja płatności niewymagana',
        unknown: 'Nieznany status płatności'
      }
    },
    cost: {
      ...translations.pl.cost,
      enterManually: 'Wpisz dane ręcznie',
      useFile: 'Dodaj PDF lub zdjęcie',
      manualTitle: 'Dane faktury kosztowej',
      manualTaxIdentifier: 'NIP / identyfikator podatkowy (opcjonalnie)',
      manualNetAmount: 'Kwota netto',
      manualVatAmount: 'Kwota VAT',
      manualGrossAmount: 'Kwota brutto',
      manualSave: 'Zapisz fakturę',
      manualSaved: 'Faktura dodana do wersji demonstracyjnej.',
      manualBackendPending: 'Zapis ręczny będzie dostępny po wdrożeniu obsługi przez backend.',
      manualErrors: {
        counterparty: 'Podaj nazwę sprzedawcy.',
        reference: 'Podaj numer faktury.',
        issueDate: 'Podaj poprawną datę wystawienia (RRRR-MM-DD).',
        dueDate: 'Podaj poprawny termin płatności (RRRR-MM-DD) lub pozostaw puste.',
        currency: 'Podaj trzyliterowy kod waluty, np. PLN.',
        netAmount: 'Podaj poprawną kwotę netto.',
        vatAmount: 'Podaj poprawną kwotę VAT.',
        grossAmount: 'Podaj poprawną kwotę brutto.'
      }
    },
    home: {
      ...translations.pl.home,
      received: 'Otrzymane',
      invoices: 'Faktury',
      incomeInvoices: 'Faktury sprzedaży',
      costBills: 'Faktury kosztowe',
      reviewNeeded: 'Do akceptacji',
      calculationsPendingTitle: 'Oczekiwanie na obliczenia',
      waitingForInvoicesBody: 'Kwoty płatności pojawią się po otrzymaniu faktur i przygotowaniu obliczeń.',
      calculationsPendingBody: 'Kwoty płatności pojawią się po zakończeniu obliczeń.',
      calculate: 'Przelicz',
      calculating: 'Przeliczanie…',
      calculateFailure: 'Nie udało się przeliczyć danych. Spróbuj ponownie.',
      demoCalculateUnavailable: 'W wersji demo nie można uruchomić obliczeń serwerowych.',
      issueCodes: {
        ...translations.pl.home.issueCodes,
        dirtyCalculationTitle: 'Obliczenia wymagają odświeżenia',
        dirtyCalculationBody: 'Przelicz dane dla tego okresu, aby zobaczyć aktualne kwoty.'
      }
    },
    status: {
      ...translations.pl.status,
      period: {
        open: 'Otwarty',
        dirty: 'Wymaga przeliczenia',
        calculated: 'Przeliczony',
        paid: 'Opłacony',
        frozen: 'Zamrożony'
      },
      completeness: { complete: 'Kompletne', incomplete: 'Niekompletne' },
      action: { freeze: 'Zamknij okres', reopen: 'Otwórz ponownie' }
    }
  },
  en: {
    ...translations.en,
    settings: {
      ...translations.en.settings,
      biometric: 'Biometric login',
      biometricEnabled: 'Biometric login enabled',
      biometricDisabled: 'Enable biometric login',
      biometricDescription: 'Unlock the app with your fingerprint or Face ID.'
    },
    invoices: {
      ...translations.en.invoices,
      search: 'Search counterparty or invoice number',
      paymentVerificationRequired: 'Required',
      paymentVerificationNotRequired: 'Not required',
      paymentNotRequiredShort: 'Not required',
      sourceKsef: 'KSeF',
      sourceUpload: 'Uploaded document',
      paymentStatuses: {
        matched: 'Paid',
        manuallyConfirmed: 'Paid manually',
        partiallyMatched: 'Partially matched',
        unmatched: 'Unmatched',
        notRequired: 'Payment verification not required',
        unknown: 'Unknown payment status'
      }
    },
    cost: {
      ...translations.en.cost,
      enterManually: 'Enter details manually',
      useFile: 'Use a PDF or image',
      manualTitle: 'Enter purchase invoice details',
      manualTaxIdentifier: 'Tax ID (optional)',
      manualNetAmount: 'Net amount',
      manualVatAmount: 'VAT amount',
      manualGrossAmount: 'Gross amount',
      manualSave: 'Save invoice',
      manualSaved: 'Invoice added to the demo profile.',
      manualBackendPending: 'Manual saving will be available when backend support is implemented.',
      manualErrors: {
        counterparty: 'Enter the supplier name.',
        reference: 'Enter the invoice number.',
        issueDate: 'Enter a valid issue date (YYYY-MM-DD).',
        dueDate: 'Enter a valid due date (YYYY-MM-DD), or leave it blank.',
        currency: 'Enter a three-letter currency code, such as PLN.',
        netAmount: 'Enter a valid net amount.',
        vatAmount: 'Enter a valid VAT amount.',
        grossAmount: 'Enter a valid gross amount.'
      }
    },
    home: {
      ...translations.en.home,
      received: 'Received',
      invoices: 'Invoices',
      incomeInvoices: 'Income invoices',
      costBills: 'Cost invoices',
      reviewNeeded: 'Review needed',
      calculationsPendingTitle: 'Waiting for calculations',
      waitingForInvoicesBody: 'Payment amounts will appear after invoices arrive and calculations are ready.',
      calculationsPendingBody: 'Payment amounts will appear when calculations are ready.',
      calculate: 'Refresh calculations',
      calculating: 'Refreshing…',
      calculateFailure: 'Could not refresh calculations. Try again.',
      demoCalculateUnavailable: 'Server-side calculation is not available in the demo.',
      issueCodes: {
        ...translations.en.home.issueCodes,
        dirtyCalculationTitle: 'Calculations need refresh',
        dirtyCalculationBody: 'Refresh the calculations for this period to see current amounts.'
      }
    },
    status: {
      ...translations.en.status,
      period: {
        open: 'Open',
        dirty: 'Needs calculation',
        calculated: 'Calculated',
        paid: 'Paid',
        frozen: 'Frozen'
      },
      completeness: { complete: 'Complete', incomplete: 'Incomplete' },
      action: { freeze: 'Freeze period', reopen: 'Reopen period' }
    }
  }
} as const;
