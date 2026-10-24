package com.smartbox.investory.notifications;

import com.smartbox.investory.integrations.management.api.model.IntegrationType;
import com.smartbox.investory.integrations.management.application.IntegrationConfigurationService;
import com.smartbox.investory.integrations.management.model.PluginConfig;
import com.smartbox.investory.integrations.telegram.TelegramClient;
import com.smartbox.investory.integrations.telegram.TelegramNotificationPlugin;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Telegram-backed notifier using the enabled global {@code telegram} integration instance. */
@Slf4j
@Service
public class TelegramNotifier implements Notifier {
  private final IntegrationConfigurationService configurations;
  private final TelegramClient client;
  private final boolean enabled;

  public TelegramNotifier(
      IntegrationConfigurationService configurations,
      TelegramClient client,
      @Value("${app.notifications.enabled:true}") boolean enabled) {
    this.configurations = configurations;
    this.client = client;
    this.enabled = enabled;
  }

  @Override
  public void notifyProfile(long profileId, String text) {
    afterCommit(() -> deliver(profileId, text));
  }

  @Override
  public void notifyOperators(String text) {
    afterCommit(() -> deliver(null, text));
  }

  private static void afterCommit(Runnable action) {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              action.run();
            }
          });
    } else {
      action.run();
    }
  }

  void deliver(Long profileId, String text) {
    if (!enabled) return;
    try {
      Optional<PluginConfig> config =
          configurations.resolveEnabledGlobal(
              IntegrationType.NOTIFICATION, TelegramNotificationPlugin.ID);
      if (config.isEmpty()) {
        log.debug("Notification skipped: Telegram integration is not enabled");
        return;
      }
      if (profileId != null
          && config.get().value(TelegramNotificationPlugin.PROFILE_ID)
              .filter(id -> !id.equals(String.valueOf(profileId)))
              .isPresent()) {
        return;
      }
      String token = config.get().value(TelegramNotificationPlugin.BOT_TOKEN).orElse(null);
      String chatId = config.get().value(TelegramNotificationPlugin.CHAT_ID).orElse(null);
      if (token == null || chatId == null) {
        log.warn("Notification skipped: Telegram integration lacks bot token or chat ID");
        return;
      }
      client.sendMessage(token, chatId, text);
    } catch (RuntimeException exception) {
      log.warn("Notification delivery failed: profileId={}, reason={}", profileId,
          exception.getMessage());
    }
  }
}
