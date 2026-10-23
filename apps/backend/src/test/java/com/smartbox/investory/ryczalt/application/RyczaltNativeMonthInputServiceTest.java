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
      new RyczaltNativeMonthInputService(inputs, lifecycle,
          com.smartbox.investory.ryczalt.calculation.rules.TestTaxRules.from2026());

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
  void savingIncompletePaidFactsPreservesNullsForReadinessChecks() {
    var withoutPaidAmounts = new RyczaltNativeMonthInputService.Command(true, false, "JDG", false,
        null, null, null, null, null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    service.save(7L, YearMonth.of(2026, 9), withoutPaidAmounts);
    org.mockito.Mockito.verify(inputs).save(org.mockito.ArgumentMatchers.any());
    org.junit.jupiter.api.Assertions.assertNull(withoutPaidAmounts.socialContributionDeduction());
    org.junit.jupiter.api.Assertions.assertNull(withoutPaidAmounts.healthContributionPaidOverride());
  }

  @Test
  void missingPaidHealthIsOptionalButMissingPaidSocialIsReported() {
    var month = YearMonth.of(2026, 1);
    var settings = new RyczaltNativeMonthInputEntity(7L, month,
        new RyczaltNativeMonthInputService.Command(true, true, "JDG", false,
            null, null, BigDecimal.ZERO, null, null,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
    when(inputs.findByProfileIdAndYearAndMonth(7L, 2026, 1)).thenReturn(Optional.of(settings));
    org.junit.jupiter.api.Assertions.assertTrue(service.settings(7L, month).missingFields().isEmpty());
    var missingSocial = new RyczaltNativeMonthInputEntity(7L, month,
        new RyczaltNativeMonthInputService.Command(true, true, "JDG", false,
            null, null, null, null, null,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
    when(inputs.findByProfileIdAndYearAndMonth(7L, 2026, 1)).thenReturn(Optional.of(missingSocial));
    org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of("socialContributionDeduction"),
        service.settings(7L, month).missingFields());
  }

  @Test
  void carriesQualifyingUopFromLatestEarlierMonthAndFailsClosedWithoutOne() {
    var earlier = new RyczaltNativeMonthInputEntity(7L, YearMonth.of(2026, 9),
        new RyczaltNativeMonthInputService.Command(true, true, "JDG", false,
            null, null, null, null, null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
    when(inputs.findEarlier(7L, 2026, 10, org.springframework.data.domain.PageRequest.of(0, 1)))
        .thenReturn(java.util.List.of(earlier));

    org.junit.jupiter.api.Assertions.assertTrue(service.carriedQualifyingUop(7L, YearMonth.of(2026, 10)));
    var error = org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
        () -> service.carriedQualifyingUop(7L, YearMonth.of(2026, 1)));
    org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("qualifyingUop"));
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
    org.junit.jupiter.api.Assertions.assertEquals(7, view.missingFields().size());
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

  @Test
  void settingsChangeBecomesTheBaseForFollowingMonthsAndRecalculates() {
    RyczaltAutoRecalculationService autoRecalculation = mock();
    var service = new RyczaltNativeMonthInputService(inputs, lifecycle,
        com.smartbox.investory.ryczalt.calculation.rules.TestTaxRules.from2026(), autoRecalculation);
    var september = uop(9, true);
    var october = uop(10, true);
    var november = uop(11, true);
    var december = uop(12, false); // explicitly set later; must not be overwritten
    when(inputs.findByProfileIdAndYearAndMonth(7L, 2026, 9)).thenReturn(Optional.of(september));
    when(inputs.findLater(7L, 2026, 9)).thenReturn(java.util.List.of(october, november, december));

    service.save(7L, YearMonth.of(2026, 9), new RyczaltNativeMonthInputService.Command(
        true, false, "JDG", false, null, null, null, null, null,
        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));

    org.junit.jupiter.api.Assertions.assertFalse(october.zusSettings().qualifyingUop());
    org.junit.jupiter.api.Assertions.assertFalse(november.zusSettings().qualifyingUop());
    org.junit.jupiter.api.Assertions.assertFalse(december.zusSettings().qualifyingUop());
    verify(inputs).save(october);
    verify(inputs).save(november);
    verify(inputs, org.mockito.Mockito.never()).save(december);
    verify(lifecycle).invalidateFrom(7L, YearMonth.of(2026, 9), InputChange.ZUS_INPUT_CHANGED, "native-month-input");
    verify(autoRecalculation).recalculateFromAfterCommit(7L, YearMonth.of(2026, 9));
  }

  @Test
  void laterMonthWithItsOwnSettingsStopsPropagation() {
    var service = new RyczaltNativeMonthInputService(inputs, lifecycle,
        com.smartbox.investory.ryczalt.calculation.rules.TestTaxRules.from2026());
    var september = uop(9, true);
    var october = uop(10, false);
    var november = uop(11, true);
    when(inputs.findByProfileIdAndYearAndMonth(7L, 2026, 9)).thenReturn(Optional.of(september));
    when(inputs.findLater(7L, 2026, 9)).thenReturn(java.util.List.of(october, november));

    service.save(7L, YearMonth.of(2026, 9), new RyczaltNativeMonthInputService.Command(
        true, false, "JDG", false, null, null, null, null, null,
        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));

    org.junit.jupiter.api.Assertions.assertTrue(november.zusSettings().qualifyingUop());
    verify(inputs, org.mockito.Mockito.never()).save(november);
  }

  private static RyczaltNativeMonthInputEntity uop(int month, boolean qualifyingUop) {
    return new RyczaltNativeMonthInputEntity(7L, YearMonth.of(2026, month),
        new RyczaltNativeMonthInputService.Command(true, qualifyingUop, "JDG", false,
            null, null, null, null, null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
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
