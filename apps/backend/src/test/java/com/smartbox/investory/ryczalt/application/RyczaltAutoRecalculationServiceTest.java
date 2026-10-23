package com.smartbox.investory.ryczalt.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.calculation.application.NativeMonthCalculationService;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class RyczaltAutoRecalculationServiceTest {
  private final NativeMonthCalculationService calculation =
      mock(NativeMonthCalculationService.class);
  private final PlatformTransactionManager transactionManager =
      mock(PlatformTransactionManager.class);

  private RyczaltAutoRecalculationService service;

  @BeforeEach
  void setUp() {
    when(transactionManager.getTransaction(any(TransactionDefinition.class)))
        .thenAnswer(ignored -> mock(TransactionStatus.class));
    service = new RyczaltAutoRecalculationService(calculation, transactionManager);
  }

  @AfterEach
  void clearSynchronization() {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.clearSynchronization();
    }
  }

  @Test
  void runsImmediatelyOutsideTransactionInRequiresNewTransactionsAndPreservesOrder() {
    YearMonth january = YearMonth.of(2026, 1);
    YearMonth february = YearMonth.of(2026, 2);

    service.recalculateAfterCommit(17L, List.of(january, february));

    InOrder ordered = inOrder(calculation);
    ordered.verify(calculation).calculateFromPersistedInvoices(17L, january);
    ordered.verify(calculation).calculateFromPersistedInvoices(17L, february);

    ArgumentCaptor<TransactionDefinition> definitions =
        ArgumentCaptor.forClass(TransactionDefinition.class);
    verify(transactionManager, org.mockito.Mockito.times(2))
        .getTransaction(definitions.capture());
    assertThat(definitions.getAllValues())
        .allSatisfy(
            definition ->
                assertThat(definition.getPropagationBehavior())
                    .isEqualTo(TransactionDefinition.PROPAGATION_REQUIRES_NEW));
    verify(transactionManager, org.mockito.Mockito.times(2)).commit(any(TransactionStatus.class));
  }

  @Test
  void defersRecalculationUntilOwningTransactionCommits() {
    YearMonth month = YearMonth.of(2026, 3);
    TransactionSynchronizationManager.initSynchronization();

    service.recalculateAfterCommit(21L, List.of(month));

    verifyNoInteractions(calculation);
    assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);

    TransactionSynchronizationManager.getSynchronizations().getFirst().afterCommit();

    verify(calculation).calculateFromPersistedInvoices(21L, month);
  }

  @Test
  void rollbackDoesNotTriggerRecalculation() {
    TransactionSynchronizationManager.initSynchronization();

    service.recalculateAfterCommit(23L, List.of(YearMonth.of(2026, 4)));

    TransactionSynchronization synchronization =
        TransactionSynchronizationManager.getSynchronizations().getFirst();
    synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);

    verifyNoInteractions(calculation);
    verify(transactionManager, never()).getTransaction(any(TransactionDefinition.class));
  }

  @Test
  void failureStopsDependentLaterMonthsAndRollsBackFailedRequiresNewTransaction() {
    YearMonth january = YearMonth.of(2026, 1);
    YearMonth february = YearMonth.of(2026, 2);
    YearMonth march = YearMonth.of(2026, 3);
    doThrow(new IllegalStateException("missing carry-forward"))
        .when(calculation)
        .calculateFromPersistedInvoices(31L, february);

    service.recalculateAfterCommit(31L, List.of(january, february, march));

    InOrder ordered = inOrder(calculation);
    ordered.verify(calculation).calculateFromPersistedInvoices(31L, january);
    ordered.verify(calculation).calculateFromPersistedInvoices(31L, february);
    verify(calculation, never()).calculateFromPersistedInvoices(31L, march);
    verify(transactionManager, org.mockito.Mockito.times(1))
        .rollback(any(TransactionStatus.class));
  }

  @Test
  void nullOrEmptyMonthListIsANoOp() {
    service.recalculateAfterCommit(41L, null);
    service.recalculateAfterCommit(41L, List.of());

    verifyNoInteractions(calculation);
    verifyNoInteractions(transactionManager);
  }
}
