package com.smartbox.investory.ryczalt.integration.ksef;

import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/** Acquires provider-neutral invoices for native Ryczalt import. */
public interface InvoiceSourcePort {
  List<InvoiceSourceRecord> fetch(KsefSyncCommand command);

  /**
   * NIP of the taxpayer whose KSeF context this source reads. Invoices may only be imported into
   * the profile that owns this NIP; empty when the source is not configured.
   */
  Optional<String> taxpayerNip();

  /** What to acquire: a target month and one or more perspectives. */
  record KsefSyncCommand(YearMonth month, Set<KsefSyncMode> modes) {}
}
