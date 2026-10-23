package com.smartbox.investory.ryczalt.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.calculation.application.NativeMonthCalculationService;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import com.smartbox.investory.ryczalt.persistence.RyczaltCalculationJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import com.smartbox.investory.shared.time.ApplicationTime;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

class RyczaltAutoRecalculationServiceTest {
  private final NativeMonthCalculationService calculation = mock();
  private final RyczaltMonthPreparationService preparation = mock();
  private final RyczaltPeriodJpaRepository periods = mock();
  private final RyczaltCalculationJpaRepository calculations = mock();
  private final RyczaltAuditEventWriter audit = mock();
  private final ApplicationTime time = mock();
  private final RyczaltAutoRecalculationService service = new RyczaltAutoRecalculationService(
      calculation, preparation, periods, calculations, audit, time, mock(JdbcTemplate.class),
      mock(PlatformTransactionManager.class));

  @BeforeEach
  void profile() {
    when(time.today()).thenReturn(LocalDate.of(2026, 10, 23));
    when(preparation.accountingStart(7L)).thenReturn(Optional.of(YearMonth.of(2026, 8)));
    when(preparation.prepare(eq(7L), any())).thenReturn(true);
    period(8, PeriodStatus.FROZEN, 81L);
    period(9, PeriodStatus.DIRTY, 91L);
  }

  @Test
  void calculatesFromTheChangedMonthIncludingNeverCalculatedMonthsAndSkipsFrozenOnes() {
    var outcome = service.recalculateFrom(7L, YearMonth.of(2026, 1));

    assertEquals(List.of(YearMonth.of(2026, 9), YearMonth.of(2026, 10)), outcome.calculated());
    verify(calculation, never()).calculateFromPersistedInvoices(7L, YearMonth.of(2026, 8));
    verify(calculation).calculateFromPersistedInvoices(7L, YearMonth.of(2026, 9));
    verify(calculation).calculateFromPersistedInvoices(7L, YearMonth.of(2026, 10));
  }

  @Test
  void stopsTheChainAtTheFirstBlockedMonthAndRecordsWhy() {
    when(calculation.calculateFromPersistedInvoices(7L, YearMonth.of(2026, 9)))
        .thenThrow(new NeedsReviewException(YearMonth.of(2026, 9), "unapproved invoice facts remain"));

    var outcome = service.recalculateFrom(7L, YearMonth.of(2026, 8));

    assertEquals(YearMonth.of(2026, 9), outcome.blockedMonth());
    verify(calculation, never()).calculateFromPersistedInvoices(7L, YearMonth.of(2026, 10));
    verify(audit).write(eq(7L), eq(91L), eq("AUTO_CALCULATION_BLOCKED"), any(), any(), any());
  }

  @Test
  void catchUpStartsAtTheFirstMonthWithoutACurrentCalculation() {
    var outcome = service.catchUp(7L);
    assertEquals(List.of(YearMonth.of(2026, 9), YearMonth.of(2026, 10)), outcome.calculated());
  }

  private void period(int month, PeriodStatus status, long id) {
    RyczaltPeriodEntity period = mock();
    when(period.getStatus()).thenReturn(status);
    when(period.id()).thenReturn(id);
    when(period.getYear()).thenReturn(2026);
    when(period.getMonth()).thenReturn(month);
    when(periods.findByProfileIdAndYearAndMonth(7L, 2026, month)).thenReturn(Optional.of(period));
  }
}
