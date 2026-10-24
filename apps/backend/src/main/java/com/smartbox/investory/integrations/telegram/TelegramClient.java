package com.smartbox.investory.integrations.telegram;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Minimal Telegram Bot API client. Error messages never contain the bot token. */
@Component
public class TelegramClient {
  static final String DEFAULT_BASE_URL = "https://api.telegram.org";
  private static final Duration TIMEOUT = Duration.ofSeconds(5);
  private static final int MAX_TEXT = 4000;

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final String baseUrl;

  @Autowired
  public TelegramClient(
      ObjectMapper objectMapper,
      @Value("${app.notifications.telegram.base-url:" + DEFAULT_BASE_URL + "}") String baseUrl) {
    this(HttpClient.newBuilder().connectTimeout(TIMEOUT).build(), objectMapper, baseUrl);
  }

  TelegramClient(HttpClient httpClient, ObjectMapper objectMapper, String baseUrl) {
    this.httpClient = httpClient;
    this.objectMapper = objectMapper;
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
  }

  public void sendMessage(String botToken, String chatId, String text) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("chat_id", chatId);
    body.put("text", text.length() > MAX_TEXT ? text.substring(0, MAX_TEXT - 1) + "…" : text);
    body.put("disable_web_page_preview", true);
    post(botToken, "sendMessage", objectMapper.writeValueAsString(body));
  }

  public void getMe(String botToken) {
    post(botToken, "getMe", "{}");
  }

  private void post(String botToken, String method, String json) {
    HttpRequest request =
        HttpRequest.newBuilder(URI.create(baseUrl + "/bot" + botToken + "/" + method))
            .timeout(TIMEOUT)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
    try {
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() / 100 != 2) {
        throw new TelegramException("Telegram " + method + " returned HTTP " + response.statusCode());
      }
    } catch (IOException exception) {
      throw new TelegramException("Failed to call Telegram " + method, exception);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new TelegramException("Interrupted while calling Telegram " + method, exception);
    }
  }

  public static class TelegramException extends RuntimeException {
    TelegramException(String message) {
      super(message);
    }

    TelegramException(String message, Throwable cause) {
      super(message, cause);
    }
  }
}
