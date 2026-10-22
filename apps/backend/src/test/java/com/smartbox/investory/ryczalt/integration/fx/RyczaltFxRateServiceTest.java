package com.smartbox.investory.ryczalt.integration.fx;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.persistence.RyczaltFxRateJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltFxResolutionJpaRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class RyczaltFxRateServiceTest {
  private final RyczaltFxRateJpaRepository rates = mock(RyczaltFxRateJpaRepository.class);
  private final RyczaltFxResolutionJpaRepository resolutions =
      mock(RyczaltFxResolutionJpaRepository.class);
  private final FxRateSourcePort source = mock(FxRateSourcePort.class);
  private final Clock clock = Clock.fixed(Instant.parse("2026-10-31T22:00:00Z"), ZoneOffset.UTC);

  @Test
  void refreshMonthPersistsObservationsAndFillsEveryDateResolution() {
    LocalDate septemberRateDate = LocalDate.of(2026, 9, 30);
    LocalDate octoberRateDate = LocalDate.of(2026, 10, 30);
    when(source.fetchHistory(LocalDate.of(2026, 9, 24), LocalDate.of(2026, 10, 31)))
        .thenReturn(
            List.of(
                rate("EUR", septemberRateDate, "4.20"),
                rate("EUR", octoberRateDate, "4.30"),
                rate("USD", septemberRateDate, "3.70"),
                rate("USD", octoberRateDate, "3.80")));
    when(rates.insertIfAbsent(any(), any(), any(), any(), any(), any())).thenReturn(1);
    when(resolutions.insertIfAbsent(any(), any(), any(), any(), any(), any(), any()))
        .thenReturn(1);

    var result = service().refreshMonth(YearMonth.of(2026, 10));

    assertThat(result.month()).isEqualTo(YearMonth.of(2026, 10));
    assertThat(result.observationsReceived()).isEqualTo(4);
    assertThat(result.ratesInserted()).isEqualTo(4);
    assertThat(result.resolutionsInserted()).isEqualTo(62);
    assertThat(result.ratesUnchanged()).isZero();
    assertThat(result.resolutionsUnchanged()).isZero();
    assertThat(result.outcome()).isEqualTo("UPDATED");
    verify(resolutions)
        .insertIfAbsent(
            eq("EUR"),
            eq(LocalDate.of(2026, 10, 31)),
            eq(octoberRateDate),
            eq(new BigDecimal("4.30")),
            eq("NBP"),
            eq("NBP-A-2026-10-30"),
            any(Instant.class));
  }

  @Test
  void repeatedRefreshReportsNoNewDataInsteadOfImplyingRowsWereUpdated() {
    when(source.fetchHistory(any(), any())).thenReturn(List.of(
        rate("EUR", LocalDate.of(2026, 9, 30), "4.20"),
        rate("USD", LocalDate.of(2026, 9, 30), "3.70")));
    var result = service().refreshMonth(YearMonth.of(2026, 10));
    assertThat(result.ratesInserted()).isZero();
    assertThat(result.resolutionsInserted()).isZero();
    assertThat(result.ratesUnchanged()).isEqualTo(2);
    assertThat(result.resolutionsUnchanged()).isEqualTo(62);
    assertThat(result.outcome()).isEqualTo("NO_NEW_DATA");
  }

  private RyczaltFxRateService service() {
    return new RyczaltFxRateService(rates, resolutions, source, clock);
  }

  private static FxRate rate(String currency, LocalDate date, String value) {
    return new FxRate(
        currency, date, date, new BigDecimal(value), "NBP", "NBP-A-" + date);
  }
}
