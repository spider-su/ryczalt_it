package com.smartbox.investory.ryczalt.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import com.smartbox.investory.ryczalt.persistence.CalculationType;
import com.smartbox.investory.ryczalt.persistence.RyczaltCalculationJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class RyczaltMobileReadinessServiceTest {
  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
  private final RyczaltNativeMonthInputJpaRepository monthInputs =
      mock(RyczaltNativeMonthInputJpaRepository.class);
  private final RyczaltPeriodJpaRepository periods = mock(RyczaltPeriodJpaRepository.class);
  private final RyczaltInvoiceJpaRepository invoices = mock(RyczaltInvoiceJpaRepository.class);
  private final RyczaltCalculationJpaRepository calculations =
      mock(RyczaltCalculationJpaRepository.class);
  private final RyczaltAuditEventWriter audit = mock(RyczaltAuditEventWriter.class);

  @Test
  void readinessReportsMissingOpeningStateInsteadOfConfiguredOrZero() {
    when(jdbc.queryForList(any(String.class), any(Object[].class))).thenReturn(List.of());
    when(monthInputs.findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(7L))
        .thenReturn(Optional.empty());
    when(monthInputs.findByProfileIdAndYearAndMonth(7L, 2026, 9)).thenReturn(Optional.empty());
    when(periods.findByProfileIdAndYearAndMonth(7L, 2026, 9)).thenReturn(Optional.empty());

    var result = service().readiness(7L, YearMonth.of(2026, 9));

    assertFalse(result.onboardingComplete());
    assertFalse(result.accountingConfigured());
    assertFalse(result.zusConfigured());
    assertEquals("HISTORICAL_DATA_MISSING", result.period().state());
    assertEquals("ACTION_REQUIRED", result.items().get(1).status());
    assertEquals("ACTION_REQUIRED", result.items().get(2).status());
  }

  @Test
  void noRevenueConfirmationIsPersistedAndAudited() {
    var period = mock(RyczaltPeriodEntity.class);
    when(periods.findLocked(7L, 2026, 9)).thenReturn(Optional.of(period));
    when(period.id()).thenReturn(91L);
    when(period.getStatus()).thenReturn(PeriodStatus.OPEN);
    when(period.getActivityConfirmationType()).thenReturn(null);
    when(period.getActivityConfirmedAt()).thenReturn(java.time.Instant.parse("2026-10-01T00:00:00Z"));
    when(invoices.findByProfileIdAndPeriodIdOrderByAccountingDateAscIdAsc(7L, 91L))
        .thenReturn(List.of());

    var result = service().confirmNoRevenue(7L, YearMonth.of(2026, 9), "owner@example.test");

    assertEquals("NO_REVENUE", result.type());
    verify(period).confirmNoRevenue(any(String.class), any(java.time.Instant.class));
    verify(periods).save(period);
    verify(audit).write(org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.eq(91L),
        org.mockito.ArgumentMatchers.eq("ACTIVITY_CONFIRMED_NO_REVENUE"),
        org.mockito.ArgumentMatchers.eq("NO_REVENUE"),
        org.mockito.ArgumentMatchers.eq("owner@example.test"), any(java.time.Instant.class));
  }

  @Test
  void noRevenueConfirmationRejectsIncomeInvoices() {
    var period = mock(RyczaltPeriodEntity.class);
    var income = mock(RyczaltInvoiceEntity.class);
    when(periods.findLocked(7L, 2026, 9)).thenReturn(Optional.of(period));
    when(period.id()).thenReturn(91L);
    when(period.getStatus()).thenReturn(PeriodStatus.OPEN);
    when(invoices.findByProfileIdAndPeriodIdOrderByAccountingDateAscIdAsc(7L, 91L))
        .thenReturn(List.of(income));
    when(income.getDirection()).thenReturn(com.smartbox.investory.ryczalt.persistence.InvoiceDirection.INCOME);

    assertThrows(IllegalStateException.class,
        () -> service().confirmNoRevenue(7L, YearMonth.of(2026, 9), "owner@example.test"));
    verify(period, never()).confirmNoRevenue(any(String.class), any(java.time.Instant.class));
    verify(audit, never()).write(any(Long.class), any(), any(), any(), any(), any());
  }

  @Test
  void repeatedNoRevenueConfirmationDoesNotRewriteEvidence() {
    var period = mock(RyczaltPeriodEntity.class);
    var confirmedAt = java.time.Instant.parse("2026-10-01T00:00:00Z");
    when(periods.findLocked(7L, 2026, 9)).thenReturn(Optional.of(period));
    when(period.id()).thenReturn(91L);
    when(period.getStatus()).thenReturn(PeriodStatus.OPEN);
    when(period.getActivityConfirmationType()).thenReturn("NO_REVENUE");
    when(period.getActivityConfirmedAt()).thenReturn(confirmedAt);
    when(invoices.findByProfileIdAndPeriodIdOrderByAccountingDateAscIdAsc(7L, 91L))
        .thenReturn(List.of());

    var result = service().confirmNoRevenue(7L, YearMonth.of(2026, 9), "owner@example.test");

    assertEquals(confirmedAt, result.confirmedAt());
    verify(period, never()).confirmNoRevenue(any(String.class), any(java.time.Instant.class));
    verify(periods, never()).save(period);
    verify(audit, never()).write(any(Long.class), any(), any(), any(), any(), any());
  }

  @Test
  void rejectsMonthsOutsideSupportedCalculationYear() {
    assertThrows(IllegalArgumentException.class,
        () -> service().readiness(7L, YearMonth.of(2027, 1)));
  }

  private RyczaltMobileReadinessService service() {
    return new RyczaltMobileReadinessService(
        jdbc, monthInputs, periods, invoices, calculations, audit);
  }
}
