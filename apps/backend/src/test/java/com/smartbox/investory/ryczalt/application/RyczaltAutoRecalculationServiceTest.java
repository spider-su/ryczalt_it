package com.smartbox.investory.ryczalt.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class RyczaltAutoRecalculationServiceTest {
  private final NativeMonthCalculationService calculation = mock();
  private final RyczaltMonthPreparationService preparation = mock();
  private final RyczaltPeriodJpaRepository periods = mock();
  private final RyczaltCalculationJpaRepository calculations = mock();
  private final RyczaltAuditEventWriter audit = mock();
  private final ApplicationTime time = mock();
  private final PlatformTransactionManager transactionManager = mock();
  private final RyczaltAutoRecalculationService service = new RyczaltAutoRecalculationService(
      calculation, preparation, periods, calculations, audit, time, mock(JdbcTemplate.class),
      transactionManager);

  @BeforeEach
  void profile() {
    when(time.today()).thenReturn(LocalDate.of(2026, 10, 23));
    when(preparation.accountingStart(7L)).thenReturn(Optional.of(YearMonth.of(2026, 8)));
    when(preparation.prepare(eq(7L), any())).thenReturn(true);
    when(transactionManager.getTransaction(any(TransactionDefinition.class)))
        .thenAnswer(ignored -> mock(TransactionStatus.class));
    period(8, PeriodStatus.FROZEN, 81L);
    period(9, PeriodStatus.DIRTY, 91L);
  }

  @AfterEach
  void clearSynchronization() {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.clearSynchronization();
    }
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

  @Test
  void runsImmediatelyOutsideTransactionInRequiresNewTransactionsAndPreservesOrder() {
    YearMonth september = YearMonth.of(2026, 9);
    YearMonth october = YearMonth.of(2026, 10);

    service.recalculateAfterCommit(7L, List.of(october, september));

    InOrder ordered = inOrder(transactionManager, preparation, calculation);
    ordered.verify(transactionManager).getTransaction(any(TransactionDefinition.class));
    ordered.verify(preparation).prepare(7L, september);
    ordered.verify(calculation).calculateFromPersistedInvoices(7L, september);
    ordered.verify(transactionManager).commit(any(TransactionStatus.class));
    ordered.verify(transactionManager).getTransaction(any(TransactionDefinition.class));
    ordered.verify(preparation).prepare(7L, october);
    ordered.verify(calculation).calculateFromPersistedInvoices(7L, october);
    ordered.verify(transactionManager).commit(any(TransactionStatus.class));

    ArgumentCaptor<TransactionDefinition> definitions =
        ArgumentCaptor.forClass(TransactionDefinition.class);
    verify(transactionManager, times(2)).getTransaction(definitions.capture());
    assertThat(definitions.getAllValues()).allSatisfy(definition ->
        assertThat(definition.getPropagationBehavior())
            .isEqualTo(TransactionDefinition.PROPAGATION_REQUIRES_NEW));
  }

  @Test
  void defersRecalculationUntilOwningTransactionCommits() {
    TransactionSynchronizationManager.initSynchronization();

    service.recalculateAfterCommit(7L, List.of(YearMonth.of(2026, 9)));

    verifyNoInteractions(calculation, preparation, transactionManager);
    assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);

    TransactionSynchronizationManager.getSynchronizations().getFirst().afterCommit();

    verify(calculation).calculateFromPersistedInvoices(7L, YearMonth.of(2026, 9));
    verify(calculation).calculateFromPersistedInvoices(7L, YearMonth.of(2026, 10));
  }

  @Test
  void rollbackDoesNotTriggerRecalculation() {
    TransactionSynchronizationManager.initSynchronization();

    service.recalculateAfterCommit(7L, List.of(YearMonth.of(2026, 9)));

    TransactionSynchronization synchronization =
        TransactionSynchronizationManager.getSynchronizations().getFirst();
    synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);

    verifyNoInteractions(calculation, preparation, transactionManager);
  }

  @Test
  void failureStopsDependentLaterMonthsAndRollsBackFailedRequiresNewTransaction() {
    YearMonth september = YearMonth.of(2026, 9);
    YearMonth october = YearMonth.of(2026, 10);
    YearMonth november = YearMonth.of(2026, 11);
    when(time.today()).thenReturn(LocalDate.of(2026, 11, 23));
    period(10, PeriodStatus.DIRTY, 101L);
    when(calculation.calculateFromPersistedInvoices(7L, october))
        .thenThrow(new IllegalStateException("missing carry-forward"));

    service.recalculateAfterCommit(7L, List.of(september, october, november));

    InOrder ordered = inOrder(transactionManager, calculation, audit);
    ordered.verify(transactionManager).getTransaction(any(TransactionDefinition.class));
    ordered.verify(calculation).calculateFromPersistedInvoices(7L, september);
    ordered.verify(transactionManager).commit(any(TransactionStatus.class));
    ordered.verify(transactionManager).getTransaction(any(TransactionDefinition.class));
    ordered.verify(calculation).calculateFromPersistedInvoices(7L, october);
    ordered.verify(transactionManager).rollback(any(TransactionStatus.class));
    ordered.verify(transactionManager).getTransaction(any(TransactionDefinition.class));
    ordered.verify(audit).write(eq(7L), eq(101L), eq("AUTO_CALCULATION_BLOCKED"),
        eq("missing carry-forward"), any(), any());
    ordered.verify(transactionManager).commit(any(TransactionStatus.class));
    verify(calculation, never()).calculateFromPersistedInvoices(7L, november);
  }

  @Test
  void nullOrEmptyMonthListIsANoOp() {
    service.recalculateAfterCommit(7L, null);
    service.recalculateAfterCommit(7L, List.of());

    verifyNoInteractions(calculation, preparation, transactionManager);
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
