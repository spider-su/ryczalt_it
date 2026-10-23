package com.smartbox.investory.ryczalt.application;

import com.smartbox.investory.ryczalt.calculation.application.NativeMonthCalculationService;
import java.time.YearMonth;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Re-runs calculation for months whose existing calculation was just invalidated by an input
 * change. Months that were never calculated are not touched, so no-change imports do nothing.
 *
 * <p>Runs after the invalidating transaction commits, in its own transaction per month. Failures
 * (for example missing no-revenue confirmation or missing month input) are logged and leave the
 * period stale for a manual calculation; they never fail the import or approval.
 */
@Service
public class RyczaltAutoRecalculationService {
  private static final Logger log = LoggerFactory.getLogger(RyczaltAutoRecalculationService.class);

  private final NativeMonthCalculationService calculation;
  private final TransactionTemplate requiresNew;

  public RyczaltAutoRecalculationService(
      NativeMonthCalculationService calculation, PlatformTransactionManager transactionManager) {
    this.calculation = calculation;
    this.requiresNew = new TransactionTemplate(transactionManager);
    this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }

  /** @param staledMonths months in ascending order whose calculation was marked stale */
  public void recalculateAfterCommit(long profileId, List<YearMonth> staledMonths) {
    if (staledMonths == null || staledMonths.isEmpty()) return;
    List<YearMonth> months = List.copyOf(staledMonths);
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              run(profileId, months);
            }
          });
    } else {
      run(profileId, months);
    }
  }

  private void run(long profileId, List<YearMonth> months) {
    for (YearMonth month : months) {
      try {
        requiresNew.executeWithoutResult(
            status -> calculation.calculateFromPersistedInvoices(profileId, month));
      } catch (RuntimeException exception) {
        // Later months depend on this one's carry-forward, so stop the chain.
        log.warn(
            "Auto-recalculation skipped for profile {} month {}: {}",
            profileId,
            month,
            exception.getMessage());
        return;
      }
    }
  }
}
