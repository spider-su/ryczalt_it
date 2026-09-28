package com.smartbox.investory.ui;

import static org.assertj.core.api.Assertions.assertThat;

import com.smartbox.investory.ui.accounting.RyczaltWebAccountingClient;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "ryczalt.backend.base-url=http://backend.test")
class RyczaltCustomerWebApplicationSmokeTest {
  @LocalServerPort private int port;
  @Autowired private RyczaltWebAccountingClient accountingClient;
  private final HttpClient httpClient = HttpClient.newHttpClient();

  @Test
  void productionApplicationContextStartsWithHttpAccountingAdapter() {
    assertThat(accountingClient).isNotNull();
    assertThat(accountingClient.getClass().getSimpleName()).isEqualTo("HttpRyczaltWebAccountingClient");
  }

  @Test
  void publicLoginPageRendersWithoutAReachableBackend() throws Exception {
    HttpResponse<String> response =
        httpClient.send(
            HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/login")).GET().build(),
            HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.body()).contains("Sign in");
  }

  @Test
  void accountingThemeAssetsAreServed() throws Exception {
    for (String asset :
        new String[] {
          "/css/tokens.css",
          "/css/base.css",
          "/css/components.css",
          "/css/tabler.min.css",
          "/css/accounting.css",
          "/js/theme.js",
          "/favicon.svg",
          "/favicon.ico",
          "/favicon-16.png",
          "/favicon-32.png",
          "/favicon-48.png",
          "/apple-touch-icon.png",
          "/favicon-najem.ico",
          "/favicon-najem-16.png",
          "/favicon-najem-32.png",
          "/favicon-najem-48.png"
        }) {
      HttpResponse<String> response =
          httpClient.send(
              HttpRequest.newBuilder(URI.create("http://localhost:" + port + asset)).GET().build(),
              HttpResponse.BodyHandlers.ofString());

      assertThat(response.statusCode()).as(asset).isEqualTo(200);
      assertThat(response.body()).as(asset).isNotBlank();
    }
  }

  @Test
  void protectedRedirectRespectsForwardedHttpsOrigin() throws Exception {
    HttpResponse<String> response =
        httpClient.send(
            HttpRequest.newBuilder(
                    URI.create("http://localhost:" + port + "/profiles/42/accounting"))
                .header("X-Forwarded-Proto", "https")
                .header("X-Forwarded-Host", "ryczalt.example.test")
                .header("X-Forwarded-Port", "443")
                .GET()
                .build(),
            HttpResponse.BodyHandlers.ofString());

    assertThat(response.statusCode()).isBetween(300, 399);
    assertThat(response.headers().firstValue("location").orElseThrow())
        .startsWith("https://ryczalt.example.test/");
  }
}
