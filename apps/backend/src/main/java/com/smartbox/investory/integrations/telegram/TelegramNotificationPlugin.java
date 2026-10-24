package com.smartbox.investory.integrations.telegram;

import com.smartbox.investory.integrations.management.api.model.ConnectionTestResult;
import com.smartbox.investory.integrations.management.api.model.IntegrationType;
import com.smartbox.investory.integrations.management.api.model.PluginFieldDescriptor;
import com.smartbox.investory.integrations.management.api.model.PluginFieldType;
import com.smartbox.investory.integrations.management.model.PluginConfig;
import com.smartbox.investory.integrations.management.model.PluginDescriptor;
import com.smartbox.investory.integrations.management.model.ValidationResult;
import com.smartbox.investory.integrations.management.spi.TestableIntegrationPlugin;
import java.util.List;
import org.springframework.stereotype.Component;

/** Telegram bot delivery channel for accounting notifications and integration alerts. */
@Component
public class TelegramNotificationPlugin implements TestableIntegrationPlugin {
  public static final String ID = "telegram";
  public static final String BOT_TOKEN = "botToken";
  public static final String CHAT_ID = "chatId";
  public static final String BOT_USERNAME = "botUsername";
  /** Optional profile filter; profile events of other profiles are not delivered to this chat. */
  public static final String PROFILE_ID = "portfolioId";

  private final TelegramClient client;

  public TelegramNotificationPlugin(TelegramClient client) {
    this.client = client;
  }

  @Override
  public String id() {
    return ID;
  }

  @Override
  public IntegrationType type() {
    return IntegrationType.NOTIFICATION;
  }

  @Override
  public PluginDescriptor descriptor() {
    return new PluginDescriptor(
        ID,
        "Telegram",
        IntegrationType.NOTIFICATION,
        List.of(
            new PluginFieldDescriptor(CHAT_ID, PluginFieldType.STRING, true, null, List.of(),
                "Chat ID", "Telegram chat that receives notifications", null, null, "-?\\d+"),
            new PluginFieldDescriptor(BOT_USERNAME, PluginFieldType.STRING, false, null, List.of(),
                "Bot username", "Informational bot username", null, null, null),
            new PluginFieldDescriptor(PROFILE_ID, PluginFieldType.STRING, false, null, List.of(),
                "Profile ID", "Only deliver events of this profile (empty = all profiles)",
                null, null, "\\d*"),
            new PluginFieldDescriptor(BOT_TOKEN, PluginFieldType.SECRET, true, null, List.of(),
                "Bot token", "Telegram bot token from @BotFather", null, null, null)),
        List.of());
  }

  @Override
  public ValidationResult validate(PluginConfig config) {
    if (!config.value(CHAT_ID).map(id -> id.matches("-?\\d+")).orElse(false)) {
      return ValidationResult.invalid("Telegram chat ID must be numeric");
    }
    if (config.value(BOT_TOKEN).isEmpty()) return ValidationResult.invalid("Bot token is required");
    if (!config.value(PROFILE_ID).map(id -> id.matches("\\d+")).orElse(true)) {
      return ValidationResult.invalid("Profile ID must be numeric");
    }
    return ValidationResult.success();
  }

  @Override
  public ConnectionTestResult testConnection(PluginConfig config) {
    ValidationResult validation = validate(config);
    if (!validation.valid()) {
      return new ConnectionTestResult(false, false, String.join(", ", validation.errors()));
    }
    try {
      client.getMe(config.value(BOT_TOKEN).orElseThrow());
      return new ConnectionTestResult(true, true, "Telegram connection succeeded");
    } catch (RuntimeException exception) {
      return new ConnectionTestResult(true, false, "Telegram connection failed");
    }
  }
}
