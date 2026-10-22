package com.smartbox.investory.ryczalt.integration.fx;

import java.time.LocalDate;
import java.util.List;

public interface FxRateSourcePort {
  FxRate fetch(String currency, LocalDate effectiveDate);

  List<FxRate> fetchHistory(LocalDate from, LocalDate to);
}
