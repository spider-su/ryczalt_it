package com.smartbox.investory.config;

import java.time.Instant;
import java.util.Map;
import org.springframework.boot.actuate.info.Info.Builder;
import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public final class RyczaltBuildInfoContributor implements InfoContributor {
  private final Environment environment;

  public RyczaltBuildInfoContributor(Environment environment) {
    this.environment = environment;
  }

  @Override
  public void contribute(Builder builder) {
    builder.withDetail(
        "build",
        Map.of(
            "version", environment.getProperty("RYCZALT_BUILD_VERSION", "0.1.0-SNAPSHOT"),
            "gitSha", environment.getProperty("RYCZALT_GIT_SHA", "unknown"),
            "buildTime", environment.getProperty("RYCZALT_BUILD_TIME", Instant.EPOCH.toString())));
  }
}
