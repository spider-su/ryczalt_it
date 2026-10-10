package com.smartbox.investory.config;

import com.smartbox.investory.integrations.ksef.KsefSyncJobPort;
import com.smartbox.investory.shared.time.ApplicationTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Syncs the current and previous Warsaw months inside the scheduler's database lock. */
@Slf4j
@Component
public class RyczaltKsefSyncJob {
  private final KsefSyncJobPort ksef;
  private final ApplicationTime time;
  private final boolean enabled;

  public RyczaltKsefSyncJob(
      KsefSyncJobPort ksef,
      ApplicationTime time,
      @Value("${app.ryczalt.ksef.sync.enabled:false}") boolean enabled) {
    this.ksef = ksef;
    this.time = time;
    this.enabled = enabled;
  }

  public void run() {
    if (!enabled) throw new IllegalStateException("Scheduled KSeF sync is disabled");
    YearMonth current = YearMonth.from(time.now(time.businessZone()));
    syncMonths(List.of(current.minusMonths(1), current));
  }

  private void syncMonths(List<YearMonth> months) {
    List<YearMonth> failures = new ArrayList<>();
    for (YearMonth month : months) {
      try {
        ksef.sync(month);
      } catch (RuntimeException exception) {
        failures.add(month);
        log.error("Scheduled KSeF sync failed for month={}", month, exception);
      }
    }
    if (!failures.isEmpty())
      throw new IllegalStateException("Scheduled KSeF sync failed for months " + failures);
  }
}
