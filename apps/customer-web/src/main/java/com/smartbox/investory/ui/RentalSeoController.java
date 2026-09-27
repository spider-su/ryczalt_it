package com.smartbox.investory.ui;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class RentalSeoController {
  private final ObjectMapper objectMapper;
  private final String publicBaseUrl;
  private final String configuredCtaUrl;

  public RentalSeoController(
      ObjectMapper objectMapper,
      @Value("${ryczalt.landing.public-base-url:}") String publicBaseUrl,
      @Value("${ryczalt.landing.cta-url:}") String configuredCtaUrl) {
    this.objectMapper = objectMapper;
    this.publicBaseUrl = safePublicBaseUrl(publicBaseUrl);
    this.configuredCtaUrl = configuredCtaUrl == null ? "" : configuredCtaUrl.trim();
  }

  @GetMapping("/ryczalt-najem")
  public String rentalLanding(Model model) {
    String canonicalUrl = publicBaseUrl.isBlank() ? "" : publicBaseUrl + "/ryczalt-najem";
    String ctaUrl = safeCtaUrl(configuredCtaUrl);
    model.addAttribute("canonicalUrl", canonicalUrl);
    model.addAttribute("ctaUrl", ctaUrl.isBlank() ? "#wersja-testowa" : ctaUrl);
    model.addAttribute("ctaConfigured", !ctaUrl.isBlank());
    model.addAttribute("structuredData", structuredData(canonicalUrl));
    return "ryczalt-najem";
  }

  private String structuredData(String canonicalUrl) {
    Map<String, Object> application = new LinkedHashMap<>();
    application.put("@context", "https://schema.org");
    application.put("@type", "SoftwareApplication");
    application.put("name", "Ryczałt");
    application.put("applicationCategory", "FinanceApplication");
    application.put("operatingSystem", "Android, iOS, Web");
    application.put(
        "description",
        "Lokalny asystent najmu prywatnego: ręczne potwierdzanie wpłat, przypomnienia i pomocnicze rozliczenie ryczałtu.");
    if (!canonicalUrl.isBlank()) application.put("url", canonicalUrl);

    List<Map<String, Object>> questions = List.of(
        faq("Czy aplikacja łączy się z bankiem?", "Nie. Aplikacja nie łączy się z bankiem i nie pobiera historii rachunku."),
        faq("Czy wpłaty są dodawane automatycznie?", "Nie. Samodzielnie potwierdzasz otrzymaną wpłatę i podajesz jej datę oraz kwotę."),
        faq("Czy mogę potwierdzić częściową wpłatę?", "Tak. Możesz zapisać otrzymaną część czynszu; pozostała oczekiwana kwota nadal wymaga sprawdzenia."),
        faq("Czy działa dla kilku mieszkań?", "Tak. Możesz prowadzić kilka mieszkań i wspólny podgląd przychodów oraz rozliczeń."),
        faq("Czy aplikacja liczy ryczałt od najmu?", "Pokazuje pomocnicze wyliczenie na podstawie zapisanych, potwierdzonych przychodów i obsługiwanych reguł. Nie uwzględnia wszystkich indywidualnych odliczeń ani nie zastępuje zeznania podatkowego."),
        faq("Gdzie są przechowywane moje dane?", "W obecnym modelu dane są przechowywane lokalnie na urządzeniu. Aplikacja nie wymaga konta w chmurze."),
        faq("Czy aplikacja działa offline?", "Dane są przechowywane lokalnie, więc podstawowe funkcje nie wymagają połączenia z serwerem. Linki do zewnętrznych usług wymagają internetu."),
        faq("Czy aplikacja zastępuje księgową?", "Nie. To pomocnik do zapisywania wpłat, przypomnień i orientacyjnego śledzenia podatku, a nie porada podatkowa ani pełna księgowość."),
        faq("Czy będzie PIT-28?", "Przygotowanie PIT-28 jest poza obecnym zakresem i pozostaje zaplanowane na późniejszy etap."),
        faq("Czy będzie backup danych?", "Eksport i import kopii zapasowej są poza obecnym zakresem i pozostają zaplanowane na późniejszy etap."));
    Map<String, Object> faqPage = new LinkedHashMap<>();
    faqPage.put("@context", "https://schema.org");
    faqPage.put("@type", "FAQPage");
    faqPage.put("mainEntity", questions);
    try {
      return objectMapper.writeValueAsString(List.of(application, faqPage));
    } catch (JacksonException exception) {
      throw new IllegalStateException("Could not serialize landing page structured data", exception);
    }
  }

  private static Map<String, Object> faq(String question, String answer) {
    return Map.of(
        "@type", "Question",
        "name", question,
        "acceptedAnswer", Map.of("@type", "Answer", "text", answer));
  }

  private static String safeCtaUrl(String value) {
    if (value == null || value.isBlank()) return "";
    String candidate = value.trim();
    if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
    if (candidate.startsWith("https://")) return candidate;
    return "";
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
