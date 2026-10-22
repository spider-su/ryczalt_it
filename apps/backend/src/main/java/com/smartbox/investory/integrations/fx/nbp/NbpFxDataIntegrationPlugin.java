package com.smartbox.investory.integrations.fx.nbp;

import com.smartbox.investory.integrations.management.api.model.IntegrationType;
import com.smartbox.investory.integrations.management.model.PluginConfig;
import com.smartbox.investory.integrations.management.model.PluginDescriptor;
import com.smartbox.investory.integrations.management.model.ValidationResult;
import com.smartbox.investory.integrations.management.spi.IntegrationPlugin;
import java.util.List;
import org.springframework.stereotype.Component;

/** Management descriptor for the built-in NBP historical FX source. */
@Component
public class NbpFxDataIntegrationPlugin implements IntegrationPlugin {
  public static final String ID = "nbp";

  @Override
  public String id() {
    return ID;
  }

  @Override
  public IntegrationType type() {
    return IntegrationType.FX_DATA;
  }

  @Override
  public PluginDescriptor descriptor() {
    return new PluginDescriptor(
        ID, "Narodowy Bank Polski (NBP)", IntegrationType.FX_DATA, List.of(), List.of("refresh-rates"));
  }

  @Override
  public ValidationResult validate(PluginConfig config) {
    return ValidationResult.success();
  }
}
