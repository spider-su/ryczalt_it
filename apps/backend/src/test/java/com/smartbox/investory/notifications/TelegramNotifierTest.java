package com.smartbox.investory.notifications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.smartbox.investory.integrations.management.api.model.IntegrationType;
import com.smartbox.investory.integrations.management.application.IntegrationConfigurationService;
import com.smartbox.investory.integrations.management.model.PluginConfig;
import com.smartbox.investory.integrations.telegram.TelegramClient;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class TelegramNotifierTest {
  private final IntegrationConfigurationService configurations =
      mock(IntegrationConfigurationService.class);
  private final TelegramClient client = mock(TelegramClient.class);

  @AfterEach
  void clearSynchronization() {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.clearSynchronization();
    }
  }

  private void configured(Map<String, String> values) {
    when(configurations.resolveEnabledGlobal(IntegrationType.NOTIFICATION, "telegram"))
        .thenReturn(Optional.of(new PluginConfig(values)));
  }

  @Test
  void deliversProfileMessageToConfiguredChat() {
    configured(Map.of("botToken", "T", "chatId", "42", "portfolioId", "1"));

    new TelegramNotifier(configurations, client, true).notifyProfile(1, "hello");

    verify(client).sendMessage("T", "42", "hello");
  }

  @Test
  void profileFilterSkipsOtherProfilesButNotOperatorAlerts() {
    configured(Map.of("botToken", "T", "chatId", "42", "portfolioId", "1"));
    var notifier = new TelegramNotifier(configurations, client, true);

    notifier.notifyProfile(2, "other profile");
    notifier.notifyOperators("KSeF failed");

    verify(client, never()).sendMessage("T", "42", "other profile");
    verify(client).sendMessage("T", "42", "KSeF failed");
  }

  @Test
  void disabledOrUnconfiguredChannelSendsNothing() {
    new TelegramNotifier(configurations, client, false).notifyOperators("x");
    when(configurations.resolveEnabledGlobal(IntegrationType.NOTIFICATION, "telegram"))
        .thenReturn(Optional.empty());
    new TelegramNotifier(configurations, client, true).notifyOperators("y");

    verifyNoInteractions(client);
  }

  @Test
  void deliveryFailureIsSwallowed() {
    configured(Map.of("botToken", "T", "chatId", "42"));
    doThrow(new IllegalStateException("down")).when(client).sendMessage(anyString(), anyString(), anyString());

    new TelegramNotifier(configurations, client, true).notifyOperators("x");

    verify(client).sendMessage("T", "42", "x");
  }

  @Test
  void insideTransactionMessageWaitsForCommit() {
    configured(Map.of("botToken", "T", "chatId", "42"));
    TransactionSynchronizationManager.initSynchronization();

    new TelegramNotifier(configurations, client, true).notifyProfile(1, "after commit");

    verifyNoInteractions(client);
    var synchronizations = TransactionSynchronizationManager.getSynchronizations();
    assertThat(synchronizations).hasSize(1);
    synchronizations.forEach(TransactionSynchronization::afterCommit);
    verify(client).sendMessage("T", "42", "after commit");
  }

  @Test
  void describeJoinsDistinctCauses() {
    var failure = new IllegalStateException("job failed",
        new IllegalStateException("profiles [1]", new RuntimeException("profiles [1]")));

    assertThat(Notifier.describe(failure)).isEqualTo("job failed ← profiles [1]");
  }
}
