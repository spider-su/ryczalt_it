package com.smartbox.investory.integrations.ksef;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.smartbox.investory.integrations.management.api.model.IntegrationType;
import com.smartbox.investory.integrations.management.application.IntegrationConfigurationService;
import com.smartbox.investory.integrations.management.model.PluginConfig;
import java.time.YearMonth;
import java.util.Map;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class KsefInvoiceServiceTest {
  @Test
  void fullLastPageFailsInsteadOfSilentlyDroppingMoreInvoices() {
    IntegrationConfigurationService configuration = mock(IntegrationConfigurationService.class);
    KsefIntegrationPlugin plugin = mock(KsefIntegrationPlugin.class);
    KsefClient client = mock(KsefClient.class);
    PluginConfig config =
        new PluginConfig(Map.of(KsefIntegrationPlugin.NIP, "1234567890", KsefIntegrationPlugin.KSEF_TOKEN, "test-token"));
    when(configuration.resolveEnabledGlobal(IntegrationType.E_INVOICING, KsefIntegrationPlugin.ID))
        .thenReturn(Optional.of(config));
    when(plugin.environment(config)).thenReturn(KsefEnvironment.TEST);
    when(client.authenticateWithToken(KsefEnvironment.TEST, "1234567890", "test-token"))
        .thenReturn(new KsefClient.KsefAccess("access", null, null, null));
    String fullPage =
        "{\"invoices\":["
            + IntStream.range(0, 250)
                .mapToObj(index -> "{\"ksefNumber\":\"K" + index + "\"}")
                .reduce((left, right) -> left + "," + right)
                .orElseThrow()
            + "]}";
    when(client.queryInvoices(
            eq(KsefEnvironment.TEST), eq("access"), eq(KsefSubject.SELLER.code()),
            any(), any(), any(Integer.class), eq(250)))
        .thenReturn(fullPage);

    assertThatThrownBy(
            () -> new KsefInvoiceService(configuration, plugin, client)
                .listInvoiceNumbers(YearMonth.of(2026, 9), KsefSubject.SELLER))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("exceeded page limit");
  }
}
