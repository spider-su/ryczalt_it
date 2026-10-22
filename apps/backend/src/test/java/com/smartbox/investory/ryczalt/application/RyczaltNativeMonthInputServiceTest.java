package com.smartbox.investory.ryczalt.application;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.calculation.InputChange;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodLifecycleService;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class RyczaltNativeMonthInputServiceTest {
  private final RyczaltNativeMonthInputJpaRepository inputs = mock();
  private final RyczaltPeriodLifecycleService lifecycle = mock();
  private final RyczaltNativeMonthInputService service =
      new RyczaltNativeMonthInputService(inputs, lifecycle);

  @org.junit.jupiter.api.BeforeEach
  void configuredOpening() {
    when(inputs.findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(7L))
        .thenReturn(Optional.of(new RyczaltNativeMonthInputEntity(7L, YearMonth.of(2026, 1),
            new RyczaltNativeMonthInputService.Command(true, false, "JDG", false,
                null, BigDecimal.ZERO, BigDecimal.ZERO, null, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                java.time.LocalDate.of(2026, 1, 1), BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO))));
  }

  @Test
  void rejectsMissingPaidFactsBeforeWriting() {
    var incomplete = new RyczaltNativeMonthInputService.Command(true, false, "JDG", false,
        null, null, null, null, null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    var error = org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
        () -> service.save(7L, YearMonth.of(2026, 9), incomplete));
    org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("socialContributionDeduction"));
    org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("healthContributionPaidOverride"));
    verifyNoInteractions(lifecycle);
    org.mockito.Mockito.verify(inputs, org.mockito.Mockito.never()).save(org.mockito.ArgumentMatchers.any());
  }

  @Test
  void refusesMonthlySaveUntilOpeningIsConfigured() {
    when(inputs.findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(7L))
        .thenReturn(Optional.empty());
    org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
        () -> service.save(7L, YearMonth.of(2026, 9), command(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO)));
    verifyNoInteractions(lifecycle);
  }

  @Test
  void reportsMissingFieldsWithoutInventingValuesAndScopesToProfile() {
    var view = service.settings(8L, YearMonth.of(2026, 9));
    org.junit.jupiter.api.Assertions.assertNull(view.settings());
    org.junit.jupiter.api.Assertions.assertEquals(8, view.missingFields().size());
    verify(inputs).findByProfileIdAndYearAndMonth(8L, 2026, 9);
    verify(inputs).findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(8L);
  }

  @Test
  void newMonthlyFactsInvalidateExistingCalculationChain() {
    service.save(7L, YearMonth.of(2026, 9), command(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
    verify(lifecycle).invalidateFrom(7L, YearMonth.of(2026, 9), InputChange.ZUS_INPUT_CHANGED, "native-month-input");
    verify(lifecycle).invalidateFrom(7L, YearMonth.of(2026, 9), InputChange.RYCZALT_DEDUCTIONS_CHANGED, "native-month-input");
    verify(lifecycle).invalidateFrom(7L, YearMonth.of(2026, 9), InputChange.VAT_ADJUSTMENT_CHANGED, "native-month-input");
  }

  @Test
  void openingStateRequiresEveryExplicitValueAndAllowsKnownZero() {
    var zero = new RyczaltNativeMonthInputService.Command(true, false, "JDG", false,
        null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
        java.time.LocalDate.of(2026, 1, 1), BigDecimal.ZERO, BigDecimal.ZERO,
        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    org.junit.jupiter.api.Assertions.assertEquals(BigDecimal.ZERO, zero.openingVatCarryForward());
    org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
        () -> new RyczaltNativeMonthInputService.Command(true, false, "JDG", false,
            null, null, BigDecimal.ZERO, null, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO, java.time.LocalDate.of(2026, 7, 1),
            new BigDecimal("42000"), null, BigDecimal.ZERO, BigDecimal.ZERO,
            new BigDecimal("125")));
  }

  @Test
  void rejectsASecondAccountingStartDateForTheProfile() {
    var july = YearMonth.of(2026, 7);
    var existing = new RyczaltNativeMonthInputEntity(7L, july,
        new RyczaltNativeMonthInputService.Command(true, false, "JDG", false,
            null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            july.atDay(1), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO));
    when(inputs.findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(7L))
        .thenReturn(Optional.of(existing));
    var september = YearMonth.of(2026, 9);
    var command = new RyczaltNativeMonthInputService.Command(true, false, "JDG", false,
        null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
        september.atDay(1), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
        BigDecimal.ZERO, BigDecimal.ZERO);

    org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
        () -> service.save(7L, september, command));

    verifyNoInteractions(lifecycle);
  }

  @Test
  void sameValuesDoNotInvalidate() {
    var command = command(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    var entity = new RyczaltNativeMonthInputEntity(7L, YearMonth.of(2026, 9), command);
    when(inputs.findByProfileIdAndYearAndMonth(7L, 2026, 9)).thenReturn(Optional.of(entity));

    service.save(7L, YearMonth.of(2026, 9), command);

    verify(inputs).save(entity);
    verifyNoInteractions(lifecycle);
  }

  @Test
  void scaleOnlyAmountChangesDoNotInvalidate() {
    var oldCommand =
        command(new BigDecimal("10.0"), new BigDecimal("20.00"), new BigDecimal("30.000"));
    var newCommand =
        command(new BigDecimal("10.00"), new BigDecimal("20.0"), new BigDecimal("30.00"));
    var entity = new RyczaltNativeMonthInputEntity(7L, YearMonth.of(2026, 9), oldCommand);
    when(inputs.findByProfileIdAndYearAndMonth(7L, 2026, 9)).thenReturn(Optional.of(entity));

    service.save(7L, YearMonth.of(2026, 9), newCommand);

    verify(inputs).save(entity);
    verifyNoInteractions(lifecycle);
  }

  @Test
  void changesInvalidateOnlyTheirCalculationAreas() {
    var oldCommand = command(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    var newCommand = command(new BigDecimal("10"), new BigDecimal("20"), new BigDecimal("30"));
    var entity = new RyczaltNativeMonthInputEntity(7L, YearMonth.of(2026, 9), oldCommand);
    when(inputs.findByProfileIdAndYearAndMonth(7L, 2026, 9)).thenReturn(Optional.of(entity));

    service.save(7L, YearMonth.of(2026, 9), newCommand);

    verify(lifecycle)
        .invalidateFrom(7L, YearMonth.of(2026, 9), InputChange.ZUS_INPUT_CHANGED, "native-month-input");
    verify(lifecycle)
        .invalidateFrom(
            7L,
            YearMonth.of(2026, 9),
            InputChange.RYCZALT_DEDUCTIONS_CHANGED,
            "native-month-input");
    verify(lifecycle)
        .invalidateFrom(
            7L, YearMonth.of(2026, 9), InputChange.VAT_ADJUSTMENT_CHANGED, "native-month-input");
  }

  private RyczaltNativeMonthInputService.Command command(
      BigDecimal ytdRevenue, BigDecimal deductions, BigDecimal vatAdjustments) {
    return new RyczaltNativeMonthInputService.Command(
        true,
        false,
        "JDG",
        false,
        ytdRevenue,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        null,
        BigDecimal.ZERO,
        deductions,
        BigDecimal.ZERO,
        vatAdjustments);
  }
}
