package com.smartbox.investory.ryczalt.persistence;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import java.time.YearMonth;
import java.util.Optional;
import java.util.List;
import org.junit.jupiter.api.Test;

class RyczaltPeriodLifecycleServiceTest {
  private final RyczaltPeriodJpaRepository periods = mock(RyczaltPeriodJpaRepository.class);
  private final RyczaltCalculationJpaRepository calculations =
      mock(RyczaltCalculationJpaRepository.class);
  private final RyczaltObligationJpaRepository obligations =
      mock(RyczaltObligationJpaRepository.class);
  private final RyczaltAuditEventWriter auditEvents = mock(RyczaltAuditEventWriter.class);

  @Test
  void freezeRequiresCurrentCalculationForEveryTaxType() {
    RyczaltPeriodEntity period = mock(RyczaltPeriodEntity.class);
    when(period.id()).thenReturn(10L);
    when(period.getStatus()).thenReturn(PeriodStatus.CALCULATED);
    when(periods.findLocked(7L, 2026, 1)).thenReturn(Optional.of(period));
    when(calculations.findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(
            7L, 10L, CalculationType.RYCZALT))
        .thenReturn(Optional.empty());

    var service =
        new RyczaltPeriodLifecycleService(periods, calculations, obligations, auditEvents);

    assertThrows(
        IllegalStateException.class,
        () -> service.freeze(7L, YearMonth.of(2026, 1), "tester", "complete period"));
  }

  @Test
  void monthCompletesAutomaticallyOnlyOnceAllThreeObligationsArePaid() {
    RyczaltPeriodEntity period = mock(RyczaltPeriodEntity.class);
    when(period.id()).thenReturn(10L);
    when(period.getStatus()).thenReturn(PeriodStatus.CALCULATED);
    when(periods.findLocked(7L, 2026, 9)).thenReturn(Optional.of(period));
    List<RyczaltCalculationEntity> current = java.util.Arrays.stream(CalculationType.values())
        .map(type -> {
          var calculation = mock(RyczaltCalculationEntity.class);
          when(calculation.getType()).thenReturn(type);
          when(calculation.isCurrent()).thenReturn(true);
          when(calculation.getStatus()).thenReturn(CalculationStatus.CURRENT);
          return calculation;
        }).toList();
    when(calculations.findByProfileIdAndPeriodId(7L, 10L)).thenReturn(current);
    var paid = obligation(com.smartbox.investory.ryczalt.domain.ObligationStatus.PAID);
    var open = obligation(com.smartbox.investory.ryczalt.domain.ObligationStatus.OPEN);
    when(obligations.findByProfileIdAndPeriodIdOrderByTypeAsc(7L, 10L))
        .thenReturn(List.of(paid, paid, open));
    var service = new RyczaltPeriodLifecycleService(periods, calculations, obligations, auditEvents);

    org.junit.jupiter.api.Assertions.assertFalse(service.completeIfSettled(7L, YearMonth.of(2026, 9)));
    verify(period, never()).markFrozen(org.mockito.ArgumentMatchers.any());

    when(obligations.findByProfileIdAndPeriodIdOrderByTypeAsc(7L, 10L))
        .thenReturn(List.of(paid, paid, paid));
    org.junit.jupiter.api.Assertions.assertTrue(service.completeIfSettled(7L, YearMonth.of(2026, 9)));
    verify(period).markFrozen(org.mockito.ArgumentMatchers.any());
    verify(auditEvents).write(org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.eq(10L),
        org.mockito.ArgumentMatchers.eq("PERIOD_FROZEN"), org.mockito.ArgumentMatchers.any(),
        org.mockito.ArgumentMatchers.eq(RyczaltPeriodLifecycleService.AUTO_COMPLETION_ACTOR),
        org.mockito.ArgumentMatchers.any());
  }

  private static RyczaltObligationEntity obligation(
      com.smartbox.investory.ryczalt.domain.ObligationStatus status) {
    var obligation = mock(RyczaltObligationEntity.class);
    when(obligation.getStatus()).thenReturn(status);
    return obligation;
  }

  @Test
  void historicalVatChangeInvalidatesLaterVatAndPreflightsFrozenDependencies() {
    var july = mock(RyczaltPeriodEntity.class);
    var august = mock(RyczaltPeriodEntity.class);
    var julyVat = mock(RyczaltCalculationEntity.class);
    var augustVat = mock(RyczaltCalculationEntity.class);
    when(july.id()).thenReturn(7L);
    when(july.getYear()).thenReturn(2026);
    when(july.getMonth()).thenReturn(7);
    when(july.getStatus()).thenReturn(PeriodStatus.CALCULATED);
    when(august.id()).thenReturn(8L);
    when(august.getYear()).thenReturn(2026);
    when(august.getMonth()).thenReturn(8);
    when(august.getStatus()).thenReturn(PeriodStatus.CALCULATED);
    when(periods.findByProfileIdOrderByYearDescMonthDesc(7L)).thenReturn(List.of(august, july));
    when(calculations.findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(7L, 7L, CalculationType.VAT))
        .thenReturn(Optional.of(julyVat));
    when(calculations.findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(7L, 8L, CalculationType.VAT))
        .thenReturn(Optional.of(augustVat));

    var service = new RyczaltPeriodLifecycleService(periods, calculations, obligations, auditEvents);
    service.invalidateFrom(7L, YearMonth.of(2026, 7),
        com.smartbox.investory.ryczalt.calculation.InputChange.VAT_ADJUSTMENT_CHANGED, "test");

    verify(julyVat).markStale();
    verify(augustVat).markStale();
  }

  @Test
  void frozenDownstreamDependencyRejectsHistoricalChangeBeforeMutation() {
    var july = mock(RyczaltPeriodEntity.class);
    var august = mock(RyczaltPeriodEntity.class);
    var frozenVat = mock(RyczaltCalculationEntity.class);
    when(july.id()).thenReturn(7L);
    when(july.getYear()).thenReturn(2026);
    when(july.getMonth()).thenReturn(7);
    when(july.getStatus()).thenReturn(PeriodStatus.CALCULATED);
    when(august.id()).thenReturn(8L);
    when(august.getYear()).thenReturn(2026);
    when(august.getMonth()).thenReturn(8);
    when(august.getStatus()).thenReturn(PeriodStatus.FROZEN);
    when(periods.findByProfileIdOrderByYearDescMonthDesc(7L)).thenReturn(List.of(august, july));
    when(calculations.findByProfileIdAndPeriodIdAndCurrentTrue(7L, 8L)).thenReturn(List.of(frozenVat));
    when(frozenVat.getType()).thenReturn(CalculationType.VAT);

    var service = new RyczaltPeriodLifecycleService(periods, calculations, obligations, auditEvents);
    assertThrows(com.smartbox.investory.ryczalt.persistence.FrozenPeriodMutationException.class,
        () -> service.invalidateFrom(7L, YearMonth.of(2026, 7),
            com.smartbox.investory.ryczalt.calculation.InputChange.VAT_ADJUSTMENT_CHANGED, "test"));
    verify(july, never()).markDirty();
  }

  @Test
  void accountingInputInvalidationClearsAndAuditsNoRevenueConfirmation() {
    var period = mock(RyczaltPeriodEntity.class);
    when(period.id()).thenReturn(9L);
    when(period.getYear()).thenReturn(2026);
    when(period.getMonth()).thenReturn(9);
    when(period.getStatus()).thenReturn(PeriodStatus.OPEN);
    when(period.clearActivityConfirmation()).thenReturn(true);
    when(periods.findByProfileIdOrderByYearDescMonthDesc(7L)).thenReturn(List.of(period));

    var service = new RyczaltPeriodLifecycleService(periods, calculations, obligations, auditEvents);
    service.invalidateFrom(7L, YearMonth.of(2026, 9),
        com.smartbox.investory.ryczalt.calculation.InputChange.VAT_ADJUSTMENT_CHANGED, "test");

    verify(periods).save(period);
    verify(auditEvents).write(org.mockito.ArgumentMatchers.eq(7L),
        org.mockito.ArgumentMatchers.eq(9L),
        org.mockito.ArgumentMatchers.eq("ACTIVITY_CONFIRMATION_CLEARED"),
        org.mockito.ArgumentMatchers.eq("VAT_ADJUSTMENT_CHANGED"),
        org.mockito.ArgumentMatchers.eq("test"), org.mockito.ArgumentMatchers.any());
  }
}
