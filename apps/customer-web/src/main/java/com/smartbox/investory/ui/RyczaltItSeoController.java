package com.smartbox.investory.ui;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Controller
public class RyczaltItSeoController {
  private final ObjectMapper objectMapper;
  private final String publicBaseUrl;

  public RyczaltItSeoController(
      ObjectMapper objectMapper,
      @Value("${ryczalt.landing.public-base-url:}") String publicBaseUrl) {
    this.objectMapper = objectMapper;
    this.publicBaseUrl = safePublicBaseUrl(publicBaseUrl);
  }

  @GetMapping("/ryczalt-it")
  public String ryczaltItLanding(Model model) {
    String canonicalUrl = publicBaseUrl.isBlank() ? "" : publicBaseUrl + "/ryczalt-it";
    model.addAttribute("canonicalUrl", canonicalUrl);
    model.addAttribute("structuredData", structuredData(canonicalUrl));
    return "ryczalt-it";
  }

  private String structuredData(String canonicalUrl) {
    Map<String, Object> application = new LinkedHashMap<>();
    application.put("@context", "https://schema.org");
    application.put("@type", "SoftwareApplication");
    application.put("name", "Ryczałt IT");
    application.put("applicationCategory", "FinanceApplication");
    application.put("operatingSystem", "Android, iOS");
    application.put(
        "description",
        "Profilowa aplikacja księgowa dla polskich JDG: faktury, ryczałt, VAT, ZUS, obowiązki i opcjonalna integracja KSeF.");
    if (!canonicalUrl.isBlank()) application.put("url", canonicalUrl);

    List<Map<String, Object>> questions = List.of(
        faq("Dla kogo jest Ryczałt IT?", "Dla polskiej jednoosobowej działalności gospodarczej (JDG). Obecnie obsługiwany jest jeden profil: ryczałt 12%, PIT miesięcznie, czynny podatnik VAT i VAT miesięcznie."),
        faq("Czy aplikacja obsługuje inne stawki i formy opodatkowania?", "Nie w obecnym zakresie. Inne stawki ryczałtu, rozliczenie kwartalne, zwolnienie z VAT, skala, podatek liniowy i inne formy działalności nie są obecnie obsługiwane."),
        faq("Czy KSeF jest wymagany?", "Nie. KSeF jest opcjonalny i można skonfigurować go później. Dostępne procesy ręcznego wprowadzania i przeglądu faktur pozostają dostępne bez połączenia KSeF."),
        faq("Czy aplikacja sama liczy podatki i składki?", "Obliczenia ryczałtu, VAT, ZUS, obowiązków i kompletności są po stronie backendu. Aplikacja prezentuje zwrócone wartości i nie zastępuje brakujących danych zerem."),
        faq("Czy muszę ręcznie wpisywać dane firmy?", "Konfiguracja prowadzi przez identyfikację firmy po NIP, potwierdzenie pobranych danych i obsługiwanej konfiguracji księgowej. Pytania o ZUS są zadawane zależnie od potrzeb obliczeń."),
        faq("Czy aplikacja łączy się bezpośrednio z moim bankiem?", "Nie oferujemy logowania do banku ani bezpośredniego podglądu rachunku. Obsługiwany jest import pliku transakcji i przegląd dopasowań; status płatności można też potwierdzić ręcznie."),
        faq("Czy mogę dodawać i przeglądać faktury?", "Tak. Aplikacja obsługuje pracę z fakturami przychodowymi i kosztowymi, ich przegląd oraz ręczne wprowadzanie lub import dokumentu w dostępnych procesach."),
        faq("Czy mogę zarządzać księgowością w przeglądarce?", "Tak. Customer web udostępnia profilowy widok okresu, dokumenty, kontrahentów, transakcje, statusy płatności i szczegółowe podsumowanie audytowe. Dostęp wymaga zalogowania i uprawnień do profilu."),
        faq("Czy każdy może samodzielnie założyć konto?", "Aktywacja konta w aplikacji mobilnej odbywa się przy użyciu zaproszenia. Nie należy traktować publicznej strony informacyjnej jako formularza otwartej rejestracji."),
        faq("Czy Ryczałt IT wysyła deklaracje do urzędu?", "Strona nie obiecuje automatycznego składania deklaracji. Przed przekazaniem dokumentów lub rozliczeń do urzędu należy sprawdzić aktualny zakres dostępny dla Twojego profilu."),
        faq("Czy aplikacja zastępuje księgową?", "Nie. To narzędzie do prowadzenia obsługiwanych procesów i prezentowania danych księgowych, a nie indywidualna porada podatkowa ani gwarancja kompletności poza obsługiwanym zakresem."));
    Map<String, Object> faqPage = new LinkedHashMap<>();
    faqPage.put("@context", "https://schema.org");
    faqPage.put("@type", "FAQPage");
    faqPage.put("mainEntity", questions);
    try {
      return objectMapper.writeValueAsString(List.of(application, faqPage));
    } catch (JacksonException exception) {
      throw new IllegalStateException("Could not serialize Ryczałt IT landing structured data", exception);
    }
  }

  private static Map<String, Object> faq(String question, String answer) {
    return Map.of(
        "@type", "Question",
        "name", question,
        "acceptedAnswer", Map.of("@type", "Answer", "text", answer));
  }

  private static String safePublicBaseUrl(String value) {
    if (value == null || value.isBlank()) return "";
    String candidate = value.trim().replaceAll("/+$", "");
    try {
      URI uri = URI.create(candidate);
      String host = uri.getHost();
      if (!"https".equalsIgnoreCase(uri.getScheme())
          || host == null
          || host.equalsIgnoreCase("localhost")
          || host.equals("127.0.0.1")
          || host.equals("0.0.0.0")
          || uri.getUserInfo() != null
          || uri.getQuery() != null
          || uri.getFragment() != null) return "";
      return candidate;
    } catch (IllegalArgumentException exception) {
      return "";
    }
  }
}
