package com.smartbox.investory.config;

import com.smartbox.investory.integrations.ksef.KsefSyncJobPort;
import com.smartbox.investory.ryczalt.application.ksef.RyczaltKsefApi;
import com.smartbox.investory.ryczalt.integration.ksef.KsefSyncMode;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/** Bridges the generic integration job to the native Ryczalt KSeF use case. */
@Slf4j
@Component
public class RyczaltKsefIntegrationJobPort implements KsefSyncJobPort {
  private static final Set<KsefSyncMode> MODES = Set.of(KsefSyncMode.SALES, KsefSyncMode.PURCHASES);

  private final RyczaltKsefApi ksef;

  public RyczaltKsefIntegrationJobPort(RyczaltKsefApi ksef) {
    this.ksef = ksef;
  }

  /** The KSeF connection belongs to one taxpayer: only profiles with that NIP are synced. */
  @Override
  public void sync(YearMonth month) {
    var profiles = ksef.connectedProfileIds();
    if (profiles.isEmpty()) {
      log.warn("KSeF sync skipped: no profile NIP matches the KSeF integration NIP, month={}", month);
      return;
    }
    var failures = new ArrayList<Long>();
    for (long profileId : profiles) {
      try {
        var result = ksef.sync(profileId, month, MODES);
        log.info(
            "KSeF sync processed: profileId={}, month={}, received={}, imported={}, duplicates={}, updated={}, failed={}",
            profileId,
            month,
            result.received(),
            result.imported(),
            result.duplicates(),
            result.updated(),
            result.failed());
        if (result.failed() > 0) {
          failures.add(profileId);
          log.warn(
              "KSeF sync completed with rejected invoices: profileId={}, month={}, failed={}; see per-invoice WARN entries for missing fields",
              profileId,
              month,
              result.failed());
        }
      } catch (RuntimeException exception) {
        failures.add(profileId);
        log.error("KSeF sync failed: profileId={}, month={}", profileId, month, exception);
      }
    }
    if (!failures.isEmpty()) {
      throw new IllegalStateException("KSeF sync failed for profiles " + failures);
    }
  }
}
