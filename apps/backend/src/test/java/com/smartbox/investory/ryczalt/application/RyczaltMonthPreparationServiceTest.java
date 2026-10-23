package com.smartbox.investory.ryczalt.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.calculation.rules.TestTaxRules;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageRequest;

class RyczaltMonthPreparationServiceTest {
  private final RyczaltNativeMonthInputJpaRepository inputs = mock();
  private final RyczaltPeriodJpaRepository periods = mock();
  private final RyczaltAuditEventWriter audit = mock();
  private final RyczaltMonthPreparationService service =
      new RyczaltMonthPreparationService(inputs, periods, TestTaxRules.from2026(), audit);

  @BeforeEach
  void opening() {
    var opening = new RyczaltNativeMonthInputEntity(7L, YearMonth.of(2026, 1),
        new RyczaltNativeMonthInputService.Command(true, false, "JDG", false, null, null, null,
            null, null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            LocalDate.of(2026, 1, 1), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO));
    when(inputs.findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(7L))
        .thenReturn(Optional.of(opening));
    when(inputs.findByProfileIdAndYearAndMonth(any(Long.class), any(Integer.class), any(Integer.class)))
        .thenReturn(Optional.empty());
    when(periods.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void carriesSettingsIntoEveryMissingMonthWithPaidAmountsLeftToTheObligation() {
    var august = new RyczaltNativeMonthInputEntity(7L, YearMonth.of(2026, 8),
        new RyczaltNativeMonthInputService.Command(true, true, "JDG", false, null,
            new BigDecimal("1800.00"), BigDecimal.ZERO, new BigDecimal("900"), BigDecimal.ZERO,
            new BigDecimal("5"), new BigDecimal("6"), new BigDecimal("7")));
    when(inputs.findEarlier(7L, 2026, 10, PageRequest.of(0, 1))).thenReturn(List.of(august));

    assertTrue(service.prepare(7L, YearMonth.of(2026, 10)));

    var saved = ArgumentCaptor.forClass(RyczaltNativeMonthInputEntity.class);
    verify(inputs, times(2)).save(saved.capture());
    List<YearMonth> months = new ArrayList<>();
    for (var row : saved.getAllValues()) {
      months.add(row.yearMonth());
      var zus = row.zusSettings();
      assertTrue(zus.jdgActive());
      assertTrue(zus.qualifyingUop());
      assertEquals(0, new BigDecimal("1800.00").compareTo(zus.fullJdgSocial()));
      assertNull(zus.socialContributionDeduction());
      assertNull(zus.healthContributionOverride());
      assertNull(zus.healthContributionPaidOverride());
      assertEquals(0, BigDecimal.ZERO.compareTo(row.deductionsAlreadyConsumed()));
      assertEquals(0, BigDecimal.ZERO.compareTo(row.salesCorrections()));
    }
    assertEquals(List.of(YearMonth.of(2026, 9), YearMonth.of(2026, 10)), months);
    verify(periods, org.mockito.Mockito.atLeast(2)).save(any(RyczaltPeriodEntity.class));
    verify(audit, times(2)).write(org.mockito.ArgumentMatchers.eq(7L), any(),
        org.mockito.ArgumentMatchers.eq("MONTH_INPUT_CARRIED"), any(), any(), any());
  }

  @Test
  void dropsAYearSpecificSocialOverrideWhenCarryingIntoANewYear() {
    var december = new RyczaltNativeMonthInputEntity(7L, YearMonth.of(2026, 12),
        new RyczaltNativeMonthInputService.Command(true, false, "JDG", false, null,
            new BigDecimal("1800.00"), null, null, null,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
    var carried = RyczaltMonthPreparationService.carried(december, YearMonth.of(2027, 1));
    assertNull(carried.fullJdgSocial());
    assertFalse(carried.qualifyingUop());
  }

  @Test
  void doesNothingBeforeTheAccountingStartOrWithoutOpeningState() {
    assertFalse(service.prepare(7L, YearMonth.of(2025, 12)));
    when(inputs.findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(8L))
        .thenReturn(Optional.empty());
    assertFalse(service.prepare(8L, YearMonth.of(2026, 5)));
    verify(inputs, never()).save(any());
    verify(periods, never()).save(any());
  }
}
