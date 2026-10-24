package com.smartbox.investory.ryczalt.settlement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

import com.smartbox.investory.ryczalt.checker.PaymentCheckStatus;
import com.smartbox.investory.ryczalt.domain.*;
import com.smartbox.investory.ryczalt.persistence.*;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SettlementServiceTest {
  private final RyczaltPeriodJpaRepository periods = mock(RyczaltPeriodJpaRepository.class);
  private final RyczaltObligationJpaRepository obligations = mock(RyczaltObligationJpaRepository.class);
  private final RyczaltTransactionJpaRepository transactions = mock(RyczaltTransactionJpaRepository.class);
  private final RyczaltPaymentMatchJpaRepository matches = mock(RyczaltPaymentMatchJpaRepository.class);
  private final RyczaltPaymentAccountResolver accounts = mock(RyczaltPaymentAccountResolver.class);
  private final RyczaltPeriodLifecycleService lifecycle = mock(RyczaltPeriodLifecycleService.class);
  private final RyczaltPeriodEntity period = mock(RyczaltPeriodEntity.class);
  private final RyczaltObligationEntity obligation = mock(RyczaltObligationEntity.class);
  private final YearMonth month = YearMonth.of(2026, 8);

  private SettlementService service(PeriodStatus status) {
    when(periods.findLocked(7L, 2026, 8)).thenReturn(Optional.of(period));
    when(period.id()).thenReturn(10L);
    when(period.getStatus()).thenReturn(status);
    when(period.getYear()).thenReturn(2026);
    when(period.getMonth()).thenReturn(8);
    when(obligations.findByProfileIdAndPeriodIdOrderByTypeAsc(7L, 10L))
        .thenReturn(List.of(obligation));
    when(obligation.isManuallyPaid()).thenReturn(true);
    when(obligation.getAmount()).thenReturn(new BigDecimal("100.04"));
    when(obligation.getPeriod()).thenReturn(period);
    return new SettlementService(periods, obligations, transactions, matches, accounts,
        BigDecimal.ZERO, lifecycle);
  }

  @Test
  void manuallyConfirmedPaymentRefreshesPersistedStatusBeforeMonthCompletion() {
    var service = service(PeriodStatus.CALCULATED);
    when(obligation.id()).thenReturn(20L);
    when(obligation.getType()).thenReturn(ObligationType.ZUS);
    when(matches.allocatedForObligation(7L, 20L)).thenReturn(new BigDecimal("60"));

    var result = service.settlePeriod(7L, month);

    assertEquals(PaymentCheckStatus.PAID, result.getFirst().status());
    var order = inOrder(obligation, obligations, lifecycle);
    order.verify(obligation).setStatus(ObligationStatus.PAID);
    order.verify(obligations).save(obligation);
    order.verify(lifecycle).completeIfSettled(7L, month);
    verify(matches, never()).save(any());
    verify(obligation, never()).markManuallyPaid(any(), any());
  }

  @Test
  void alreadyFrozenPeriodRetainsItsPaymentHistoryAndStatus() {
    var result = service(PeriodStatus.FROZEN).settlePeriod(7L, month);

    assertEquals(PaymentCheckStatus.PAID, result.getFirst().status());
    verify(obligation, never()).setStatus(any());
    verify(obligations, never()).save(any());
    verifyNoInteractions(matches, lifecycle);
  }
}
