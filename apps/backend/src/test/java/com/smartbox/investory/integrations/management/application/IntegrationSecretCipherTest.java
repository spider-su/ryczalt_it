package com.smartbox.investory.integrations.management.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class IntegrationSecretCipherTest {
  private static final String VALID_KEY = "test-only-ryczalt-integration-master-key";

  @Test
  void allowsApplicationConstructionWithoutIntegrationKeyButFailsWhenEncrypting() {
    IntegrationSecretCipher cipher = new IntegrationSecretCipher("");

    assertThatThrownBy(() -> cipher.encrypt("secret"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("RYCZALT_INTEGRATION_MASTER_KEY is not configured");
  }

  @Test
  void failsClearlyWhenDecryptingWithoutIntegrationKey() {
    IntegrationSecretCipher cipher = new IntegrationSecretCipher(null);
    String validIvOnly = Base64.getEncoder().encodeToString(new byte[12]);

    assertThatThrownBy(() -> cipher.decrypt(validIvOnly))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("RYCZALT_INTEGRATION_MASTER_KEY is not configured");
  }

  @Test
  void rejectsShortIntegrationKeysAtUseTime() {
    IntegrationSecretCipher cipher = new IntegrationSecretCipher("too-short");

    assertThatThrownBy(() -> cipher.encrypt("secret"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("RYCZALT_INTEGRATION_MASTER_KEY must be at least 32 characters");
  }

  @Test
  void encryptsAndDecryptsWithConfiguredKey() {
    IntegrationSecretCipher cipher = new IntegrationSecretCipher(VALID_KEY);

    assertThat(cipher.decrypt(cipher.encrypt("sensitive-value"))).isEqualTo("sensitive-value");
  }
}
