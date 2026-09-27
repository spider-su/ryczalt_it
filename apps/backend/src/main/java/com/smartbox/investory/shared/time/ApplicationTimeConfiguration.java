package com.smartbox.investory.shared.time;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Provides the shared application clock and accounting business timezone. */
@Configuration(proxyBeanMethods = false)
public class ApplicationTimeConfiguration {
  @Bean
  Clock applicationClock() {
    return Clock.systemUTC();
  }

  @Bean
  ZoneId accountingBusinessZone(
      @Value("${app.business-time-zone:Europe/Warsaw}") String businessTimeZone) {
    return ZoneId.of(businessTimeZone);
  }

  @Bean
  ApplicationTime applicationTime(Clock applicationClock, ZoneId accountingBusinessZone) {
    return new ClockApplicationTime(applicationClock, accountingBusinessZone);
  }
}
