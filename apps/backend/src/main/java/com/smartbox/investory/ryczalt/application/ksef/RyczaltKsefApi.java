package com.smartbox.investory.ryczalt.application.ksef;

import com.smartbox.investory.ryczalt.integration.ksef.KsefSyncMode;
import java.time.YearMonth;
import java.util.Set;

/** Native Ryczalt KSeF acquisition boundary. */
public interface RyczaltKsefApi {
  RyczaltKsefSyncResult sync(long profileId, YearMonth month, Set<KsefSyncMode> modes);

  RyczaltKsefSyncResult reimport(long profileId, YearMonth month);
}
