package com.smartbox.investory.ryczalt.application.query;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.domain.ObligationStatus;
import com.smartbox.investory.ryczalt.domain.ObligationType;
import com.smartbox.investory.ryczalt.persistence.RyczaltObligationEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltObligationJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPaymentMatchJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import com.smartbox.investory.shared.currency.CurrencyType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class RyczaltPaymentQueryServiceTest {
  private final RyczaltPeriodJpaRepository periods = mock(RyczaltPeriodJpaRepository.class);
  private final RyczaltObligationJpaRepository obligations = mock(RyczaltObligationJpaRepository.class);
  private final RyczaltPaymentMatchJpaRepository matches = mock(RyczaltPaymentMatchJpaRepository.class);

  @Test
  void toleranceDoesNotClearAnUnpaidObligation() {
    RyczaltObligationEntity obligation = mock(RyczaltObligationEntity.class);
    when(obligation.id()).thenReturn(4L);
    when(obligation.getType()).thenReturn(ObligationType.ZUS);
    when(obligation.getAmount()).thenReturn(new BigDecimal("0.04"));
    when(obligation.getCurrency()).thenReturn(CurrencyType.PLN);
    when(obligation.getDueDate()).thenReturn(LocalDate.of(2026, 10, 20));
    when(obligation.isManuallyPaid()).thenReturn(false);
    when(matches.allocatedForObligation(7L, 4L)).thenReturn(BigDecimal.ZERO);

    var result =
        new RyczaltPaymentQueryService(periods, obligations, matches, new BigDecimal("0.05"))
            .obligationModels(7L, List.of(obligation))
            .getFirst();

    assertThat(result.status()).isEqualTo(ObligationStatus.OPEN);
    assertThat(result.paidAmount()).isZero();
    assertThat(result.outstandingAmount()).isEqualByComparingTo("0.04");
  }

  @Test
  void toleranceClearsSmallResidualAfterRecordedPayment() {
    RyczaltObligationEntity obligation = mock(RyczaltObligationEntity.class);
    when(obligation.id()).thenReturn(4L);
    when(obligation.getType()).thenReturn(ObligationType.ZUS);
    when(obligation.getAmount()).thenReturn(new BigDecimal("100.04"));
    when(obligation.getCurrency()).thenReturn(CurrencyType.PLN);
    when(obligation.getDueDate()).thenReturn(LocalDate.of(2026, 10, 20));
    when(obligation.isManuallyPaid()).thenReturn(false);
    when(matches.allocatedForObligation(7L, 4L)).thenReturn(new BigDecimal("100.00"));

    var result =
        new RyczaltPaymentQueryService(periods, obligations, matches, new BigDecimal("0.05"))
            .obligationModels(7L, List.of(obligation))
            .getFirst();

    assertThat(result.status()).isEqualTo(ObligationStatus.PAID);
    assertThat(result.outstandingAmount()).isZero();
  }
}
