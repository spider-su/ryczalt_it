package com.smartbox.investory.config;

import com.smartbox.investory.ryczalt.application.RyczaltAutoRecalculationService;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily catch-up that opens the new month (period plus settings carried from the previous month)
 * and calculates every month that is not yet calculated, so a month with only auto-approved
 * invoices needs no user action besides paying the three obligations.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true")
public class RyczaltMonthRolloverScheduler {
  private final RyczaltNativeMonthInputJpaRepository monthInputs;
  private final RyczaltAutoRecalculationService autoCalculation;

  @Scheduled(
      cron = "${app.ryczalt.month-rollover.cron:0 15 2 * * *}",
      zone = "${app.ryczalt.month-rollover.zone:Europe/Warsaw}")
  public void run() {
    for (Long profileId : monthInputs.findConfiguredProfileIds()) {
      try {
        var outcome = autoCalculation.catchUp(profileId);
        if (!outcome.calculated().isEmpty() || outcome.blockedMonth() != null)
          log.info("Month rollover for profile {}: calculated={}, blocked={} ({})", profileId,
              outcome.calculated(), outcome.blockedMonth(), outcome.blockedReason());
      } catch (RuntimeException exception) {
        log.warn("Month rollover failed for profile {}: {}", profileId, exception.getMessage());
      }
    }
  }
}
