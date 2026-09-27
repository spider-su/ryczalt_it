package com.smartbox.investory.ryczalt.calculation.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.calculation.vat.VatCalculationInput;
import com.smartbox.investory.ryczalt.calculation.zus.ZusCalculationInput;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import com.smartbox.investory.ryczalt.persistence.RyczaltCalculationEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltCalculationJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltCalculationPersistenceAdapter;
import com.smartbox.investory.ryczalt.persistence.RyczaltObligationJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import com.smartbox.investory.ryczalt.settlement.SettlementService;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.Test;

class NativeMonthCalculationServiceTest {
  private final RyczaltPeriodJpaRepository periods = mock(RyczaltPeriodJpaRepository.class);
  private final NativeMonthInputAggregator inputAggregator = mock(NativeMonthInputAggregator.class);
  private final RyczaltCalculationPersistenceAdapter calculations =
      mock(RyczaltCalculationPersistenceAdapter.class);
  private final RyczaltCalculationJpaRepository calculationRows =
      mock(RyczaltCalculationJpaRepository.class);
  private final RyczaltObligationJpaRepository obligations =
      mock(RyczaltObligationJpaRepository.class);
  private final SettlementService settlement = mock(SettlementService.class);

  @Test
  void calculatesAllTaxesAndCreatesThreeObligationsForNewMonth() {
    YearMonth month = YearMonth.of(2026, 9);
    RyczaltPeriodEntity period = mock(RyczaltPeriodEntity.class);
    when(period.id()).thenReturn(10L);
    when(period.getYear()).thenReturn(2026);
    when(period.getMonth()).thenReturn(9);
    when(period.getStatus()).thenReturn(PeriodStatus.OPEN);
    when(periods.findLocked(7L, 2026, 9)).thenReturn(Optional.of(period));
    when(obligations.findByProfileIdAndPeriodIdOrderByTypeAsc(7L, period.id()))
        .thenReturn(List.of());
    when(calculations.saveCurrent(any(), any(Long.TYPE), any(), any(), any(), any(), any()))
        .thenAnswer(invocation -> mock(RyczaltCalculationEntity.class));

    var service =
        new NativeMonthCalculationService(
            periods,
            inputAggregator,
            calculations,
            obligations,
            settlement,
            calculationRows,
            JsonMapper.builder().build());
    var result =
        service.calculate(
            7L,
            month,
            new NativeMonthCalculationInput(
                Map.of(new BigDecimal("0.12"), new BigDecimal("10000.00")),
                new VatCalculationInput(
                    new BigDecimal("2300.00"), BigDecimal.ZERO, new BigDecimal("100.00")),
                new ZusCalculationInput(
                    true,
                    false,
                    "JDG",
                    false,
                    new BigDecimal("10000.00"),
                    new BigDecimal("2000.00")),
                BigDecimal.ZERO));

    assertEquals(new BigDecimal("947"), result.ryczalt());
    assertEquals(0, result.vat().compareTo(new BigDecimal("2200.00")));
    assertEquals(result.zusResult().total(), result.zus());
    verify(calculations, times(3))
        .saveCurrent(any(), any(Long.TYPE), any(), any(), any(), any(), any());
    verify(obligations, times(3)).save(any());
    verify(periods).save(period);
    verify(settlement).settlePeriod(7L, month);
  }

  @Test
  void carriesPreviousVatExcessIntoFollowingMonthCalculation() {
    YearMonth month = YearMonth.of(2026, 10);
    RyczaltPeriodEntity current = mock(RyczaltPeriodEntity.class);
    RyczaltPeriodEntity previous = mock(RyczaltPeriodEntity.class);
    RyczaltCalculationEntity previousVat = mock(RyczaltCalculationEntity.class);
    when(current.id()).thenReturn(11L);
    when(current.getYear()).thenReturn(2026);
    when(current.getMonth()).thenReturn(10);
    when(current.getStatus()).thenReturn(PeriodStatus.OPEN);
    when(periods.findLocked(7L, 2026, 10)).thenReturn(Optional.of(current));
    when(periods.findByProfileIdAndYearAndMonth(7L, 2026, 9)).thenReturn(Optional.of(previous));
    when(previous.id()).thenReturn(10L);
    when(calculationRows.findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(
            7L, 10L, com.smartbox.investory.ryczalt.persistence.CalculationType.VAT))
        .thenReturn(Optional.of(previousVat));
    when(previousVat.getResultJson()).thenReturn("{\"excessVatCarryForward\":30}");
    when(obligations.findByProfileIdAndPeriodIdOrderByTypeAsc(7L, 11L)).thenReturn(List.of());
    when(calculations.saveCurrent(any(), any(Long.TYPE), any(), any(), any(), any(), any()))
        .thenAnswer(invocation -> mock(RyczaltCalculationEntity.class));

    var result =
        service().calculate(
            7L,
            month,
            new NativeMonthCalculationInput(
                Map.of(new BigDecimal("0.12"), new BigDecimal("1000")),
                new VatCalculationInput(
                    new BigDecimal("100"), BigDecimal.ZERO, BigDecimal.ZERO),
                new ZusCalculationInput(true, false, "JDG", false, BigDecimal.ZERO, null),
                BigDecimal.ZERO));

    assertEquals(new BigDecimal("30"), result.vatResult().carryForwardInputVat());
    assertEquals(new BigDecimal("70"), result.vat());
  }

  @Test
  void rejectsPreviousVatSnapshotWithoutCarryForwardInsteadOfAssumingZero() {
    YearMonth month = YearMonth.of(2026, 10);
    RyczaltPeriodEntity current = mock(RyczaltPeriodEntity.class);
    RyczaltPeriodEntity previous = mock(RyczaltPeriodEntity.class);
    RyczaltCalculationEntity previousVat = mock(RyczaltCalculationEntity.class);
    when(current.getYear()).thenReturn(2026);
    when(current.getMonth()).thenReturn(10);
    when(current.getStatus()).thenReturn(PeriodStatus.OPEN);
    when(periods.findLocked(7L, 2026, 10)).thenReturn(Optional.of(current));
    when(periods.findByProfileIdAndYearAndMonth(7L, 2026, 9)).thenReturn(Optional.of(previous));
    when(previous.id()).thenReturn(10L);
    when(calculationRows.findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(
            7L, 10L, com.smartbox.investory.ryczalt.persistence.CalculationType.VAT))
        .thenReturn(Optional.of(previousVat));
    when(previousVat.getResultJson()).thenReturn("{}");

    org.junit.jupiter.api.Assertions.assertThrows(
        IllegalStateException.class,
        () ->
            service()
                .calculate(
                    7L,
                    month,
                    new NativeMonthCalculationInput(
                        Map.of(),
                        new VatCalculationInput(
                            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO),
                        new ZusCalculationInput(true, false, "JDG", false, BigDecimal.ZERO, null),
                        BigDecimal.ZERO)));
  }

  private NativeMonthCalculationService service() {
    return new NativeMonthCalculationService(
        periods,
        inputAggregator,
        calculations,
        obligations,
        settlement,
        calculationRows,
        JsonMapper.builder().build());
  }
}
