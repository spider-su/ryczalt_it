package com.smartbox.investory.ryczalt.application;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.calculation.application.NativeMonthCalculationService;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import com.smartbox.investory.ryczalt.persistence.CalculationType;
import com.smartbox.investory.ryczalt.persistence.RyczaltCalculationJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import com.smartbox.investory.shared.time.ApplicationTime;
import java.time.Instant;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Keeps the calculation chain current without user action.
 *
 * <p>From a changed month up to the current month (or the latest existing period, if later) every
 * unfrozen month is prepared (period and carried settings created when missing) and calculated,
 * including months that were never calculated before. Months that are already calculated and not
 * invalidated, and frozen months, are skipped. Each month runs in its own transaction; the chain
 * stops at the first month that cannot be calculated, because later months need its carry-forward.
 * That month gets an {@code AUTO_CALCULATION_BLOCKED} audit event with the reason; the failure never
 * fails the import, approval or settings change that triggered it.
 */
@Service
public class RyczaltAutoRecalculationService {
  private static final Logger log = LoggerFactory.getLogger(RyczaltAutoRecalculationService.class);
  static final String ACTOR = "system:auto-calculation";

  private final NativeMonthCalculationService calculation;
  private final RyczaltMonthPreparationService preparation;
  private final RyczaltPeriodJpaRepository periods;
  private final RyczaltCalculationJpaRepository calculations;
  private final RyczaltAuditEventWriter auditEvents;
  private final ApplicationTime time;
  private final org.springframework.jdbc.core.JdbcTemplate jdbc;
  private final TransactionTemplate requiresNew;

  public RyczaltAutoRecalculationService(
      NativeMonthCalculationService calculation,
      RyczaltMonthPreparationService preparation,
      RyczaltPeriodJpaRepository periods,
      RyczaltCalculationJpaRepository calculations,
      RyczaltAuditEventWriter auditEvents,
      ApplicationTime time,
      org.springframework.jdbc.core.JdbcTemplate jdbc,
      PlatformTransactionManager transactionManager) {
    this.calculation = calculation;
    this.preparation = preparation;
    this.periods = periods;
    this.calculations = calculations;
    this.auditEvents = auditEvents;
    this.time = time;
    this.jdbc = jdbc;
    this.requiresNew = new TransactionTemplate(transactionManager);
    this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
  }

  /** Recalculates from the earliest of {@code changedMonths} once the current transaction commits. */
  public void recalculateAfterCommit(long profileId, List<YearMonth> changedMonths) {
    if (changedMonths == null || changedMonths.isEmpty()) return;
    recalculateFromAfterCommit(profileId, changedMonths.stream().min(Comparator.naturalOrder()).get());
  }

  /** Recalculates from {@code from} once the current transaction commits (immediately without one). */
  public void recalculateFromAfterCommit(long profileId, YearMonth from) {
    if (from == null) return;
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              recalculateFrom(profileId, from);
            }
          });
    } else {
      recalculateFrom(profileId, from);
    }
  }

  /**
   * Catch-up used by the scheduler: prepares the current month and calculates from the earliest
   * unfrozen month that has no current calculation.
   */
  public Outcome catchUp(long profileId) {
    YearMonth start = preparation.accountingStart(profileId).orElse(null);
    if (start == null) return new Outcome(List.of(), null, null);
    YearMonth current = YearMonth.from(time.today());
    for (YearMonth cursor = start; !cursor.isAfter(current); cursor = cursor.plusMonths(1)) {
      if (needsCalculation(profileId, cursor)) return recalculateFrom(profileId, cursor);
    }
    return new Outcome(List.of(), null, null);
  }

  /** Runs the chain now. Each month uses its own transaction. */
  public Outcome recalculateFrom(long profileId, YearMonth from) {
    YearMonth start = preparation.accountingStart(profileId).orElse(null);
    if (start == null) return new Outcome(List.of(), null, null);
    YearMonth first = from.isBefore(start) ? start : from;
    YearMonth end = lastMonth(profileId);
    List<YearMonth> calculated = new java.util.ArrayList<>();
    for (YearMonth month = first; !month.isAfter(end); month = month.plusMonths(1)) {
      YearMonth target = month;
      try {
        Step step = requiresNew.execute(status -> step(profileId, target));
        if (step == Step.CALCULATED) calculated.add(target);
        if (step == Step.UNPREPARED) return new Outcome(calculated, null, null);
      } catch (RuntimeException exception) {
        log.warn("Auto-calculation blocked for profile {} month {}: {}",
            profileId, target, exception.getMessage());
        recordBlocked(profileId, target, exception);
        return new Outcome(calculated, target, exception.getMessage());
      }
    }
    return new Outcome(calculated, null, null);
  }

  private Step step(long profileId, YearMonth month) {
    if (!preparation.prepare(profileId, month)) return Step.UNPREPARED;
    if (!needsCalculation(profileId, month)) return Step.SKIPPED;
    calculation.calculateFromPersistedInvoices(profileId, month);
    return Step.CALCULATED;
  }

  /** A month needs calculation unless it is frozen, or calculated with all results current. */
  private boolean needsCalculation(long profileId, YearMonth month) {
    Optional<RyczaltPeriodEntity> period =
        periods.findByProfileIdAndYearAndMonth(profileId, month.getYear(), month.getMonthValue());
    if (period.isEmpty()) return true;
    PeriodStatus status = period.get().getStatus();
    if (status.isFrozen()) return false;
    if (status != PeriodStatus.CALCULATED && status != PeriodStatus.PAID) return true;
    for (CalculationType type : CalculationType.values()) {
      if (calculations
          .findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(profileId, period.get().id(), type)
          .isEmpty()) return true;
    }
    return false;
  }

  private YearMonth lastMonth(long profileId) {
    YearMonth current = YearMonth.from(time.today());
    return periods.findByProfileIdOrderByYearDescMonthDesc(profileId).stream()
        .findFirst()
        .map(period -> YearMonth.of(period.getYear(), period.getMonth()))
        .filter(latest -> latest.isAfter(current))
        .orElse(current);
  }

  private void recordBlocked(long profileId, YearMonth month, RuntimeException exception) {
    try {
      requiresNew.executeWithoutResult(status -> {
        Long periodId = periods
            .findByProfileIdAndYearAndMonth(profileId, month.getYear(), month.getMonthValue())
            .map(RyczaltPeriodEntity::id)
            .orElse(null);
        String reason = exception.getMessage() == null
            ? exception.getClass().getSimpleName() : exception.getMessage();
        String stored = reason.length() > 1000 ? reason.substring(0, 1000) : reason;
        if (jdbc != null && periodId != null && stored.equals(lastBlockedReason(profileId, periodId))) return;
        auditEvents.write(profileId, periodId, "AUTO_CALCULATION_BLOCKED", stored, ACTOR, Instant.now());
      });
    } catch (RuntimeException auditFailure) {
      log.warn("Could not record blocked auto-calculation for profile {} month {}: {}",
          profileId, month, auditFailure.getMessage());
    }
  }

  private enum Step { CALCULATED, SKIPPED, UNPREPARED }

  /** Reason of the period's latest audit event when it is still the same blocked state, else null. */
  private String lastBlockedReason(long profileId, long periodId) {
    var rows = jdbc.queryForList(
        "SELECT event_type, reason FROM ryczalt.ryczalt_audit_event"
            + " WHERE profile_id = ? AND period_id = ? ORDER BY occurred_at DESC, id DESC LIMIT 1",
        profileId, periodId);
    if (rows.isEmpty() || !"AUTO_CALCULATION_BLOCKED".equals(rows.getFirst().get("event_type")))
      return null;
    return (String) rows.getFirst().get("reason");
  }

  /**
   * @param calculated months calculated by this run
   * @param blockedMonth the month that stopped the chain, if any
   * @param blockedReason why it could not be calculated
   */
  public record Outcome(List<YearMonth> calculated, YearMonth blockedMonth, String blockedReason) {}
}
