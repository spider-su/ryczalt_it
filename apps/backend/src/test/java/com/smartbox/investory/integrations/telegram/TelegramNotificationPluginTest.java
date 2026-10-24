package com.smartbox.investory.integrations.telegram;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

import com.smartbox.investory.integrations.management.model.PluginConfig;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TelegramNotificationPluginTest {
  private final TelegramClient client = mock(TelegramClient.class);
  private final TelegramNotificationPlugin plugin = new TelegramNotificationPlugin(client);

  @Test
  void validatesChatTokenAndProfileFilter() {
    assertThat(plugin.validate(new PluginConfig(Map.of("chatId", "-100123", "botToken", "T"))).valid())
        .isTrue();
    assertThat(plugin.validate(new PluginConfig(Map.of("chatId", "abc", "botToken", "T"))).valid())
        .isFalse();
    assertThat(plugin.validate(new PluginConfig(Map.of("chatId", "1"))).valid()).isFalse();
    assertThat(plugin.validate(
            new PluginConfig(Map.of("chatId", "1", "botToken", "T", "portfolioId", "x"))).valid())
        .isFalse();
  }

  @Test
  void connectionTestReportsFailureWithoutLeakingDetails() {
    doThrow(new TelegramClient.TelegramException("Telegram getMe returned HTTP 401"))
        .when(client).getMe("T");

    var result = plugin.testConnection(new PluginConfig(Map.of("chatId", "1", "botToken", "T")));

    assertThat(result.success()).isFalse();
    assertThat(result.message()).isEqualTo("Telegram connection failed");
  }
}
