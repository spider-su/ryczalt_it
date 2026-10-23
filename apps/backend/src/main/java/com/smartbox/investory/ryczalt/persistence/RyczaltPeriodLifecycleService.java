package com.smartbox.investory.ryczalt.persistence;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.calculation.CalculationInvalidationPolicy;
import com.smartbox.investory.ryczalt.calculation.InputChange;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import java.time.Instant;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Owns period transitions and writes a small audit trail for material transitions. */
@Service
public class RyczaltPeriodLifecycleService {
  private final RyczaltPeriodJpaRepository periods;
  private final RyczaltCalculationJpaRepository calculations;
  private final RyczaltObligationJpaRepository obligations;
  private final RyczaltAuditEventWriter auditEvents;

  public RyczaltPeriodLifecycleService(
      RyczaltPeriodJpaRepository periods,
      RyczaltCalculationJpaRepository calculations,
      RyczaltObligationJpaRepository obligations,
      RyczaltAuditEventWriter auditEvents) {
    this.periods = periods;
    this.calculations = calculations;
    this.obligations = obligations;
    this.auditEvents = auditEvents;
  }

  @Transactional
  public void freeze(long profileId, YearMonth month, String actor, String reason) {
    requireReason(reason);
    RyczaltPeriodEntity period = findLocked(profileId, month);
    if (!period.getStatus().canFreeze()) {
      throw new IllegalStateException("Only calculated or paid periods can be frozen");
    }
    if (!FreezeEligibility.isEligible(
        period,
        calculations.findByProfileIdAndPeriodId(profileId, period.id()),
        obligations.findByProfileIdAndPeriodIdOrderByTypeAsc(profileId, period.id()))) {
      throw new IllegalStateException(
          "Period needs current calculations and settled obligations before freezing");
    }
    freezeEligible(profileId, period, actor, reason);
  }

  /**
   * Completes the month automatically once its three obligations are paid and its calculations are
   * current: the period becomes immutable history. A no-op otherwise.
   *
   * @return true when the period was frozen by this call
   */
  @Transactional
  public boolean completeIfSettled(long profileId, YearMonth month) {
    RyczaltPeriodEntity period =
        periods.findLocked(profileId, month.getYear(), month.getMonthValue()).orElse(null);
    if (period == null || period.getStatus().isFrozen() || !period.getStatus().canFreeze()) return false;
    if (!FreezeEligibility.isEligible(
        period,
        calculations.findByProfileIdAndPeriodId(profileId, period.id()),
        obligations.findByProfileIdAndPeriodIdOrderByTypeAsc(profileId, period.id()))) return false;
    freezeEligible(profileId, period, AUTO_COMPLETION_ACTOR, "All obligations paid");
    return true;
  }

  public static final String AUTO_COMPLETION_ACTOR = "system:month-completion";

  private void freezeEligible(
      long profileId, RyczaltPeriodEntity period, String actor, String reason) {
    period.markFrozen(Instant.now());
    periods.save(period);
    calculations
        .findByProfileIdAndPeriodIdAndCurrentTrue(profileId, period.id())
        .forEach(
            calculation -> {
              calculation.markFrozen();
              calculations.save(calculation);
            });
    auditEvents.write(profileId, period.id(), "PERIOD_FROZEN", reason, actor, Instant.now());
  }

  @Transactional
  public void reopen(long profileId, YearMonth month, String actor, String reason) {
    requireReason(reason);
    RyczaltPeriodEntity period = findLocked(profileId, month);
    if (!period.getStatus().isFrozen()) throw new IllegalStateException("Period is not frozen");
    period.markReopened(reason, Instant.now());
    periods.save(period);
    auditEvents.write(profileId, period.id(), "PERIOD_REOPENED", reason, actor, Instant.now());
  }

  @Transactional
  public List<YearMonth> invalidate(
      long profileId, YearMonth month, InputChange change, String actor) {
    return invalidateFrom(profileId, month, change, actor);
  }

  /**
   * Invalidates affected calculations from {@code month} onward.
   *
   * @return months (ascending) whose current calculation was actually marked stale
   */
  @Transactional
  public List<YearMonth> invalidateFrom(
      long profileId, YearMonth month, InputChange change, String actor) {
    Set<CalculationType> affected = CalculationInvalidationPolicy.affectedBy(change);
    List<YearMonth> staled = new ArrayList<>();
    var chain = periods.findByProfileIdOrderByYearDescMonthDesc(profileId).stream()
        .filter(period -> !YearMonth.of(period.getYear(), period.getMonth()).isBefore(month))
        .sorted(java.util.Comparator.comparing(p -> YearMonth.of(p.getYear(), p.getMonth())))
        .toList();
    for (var period : chain) {
      if (!affected.isEmpty() && period.getStatus().isFrozen()
          && calculations.findByProfileIdAndPeriodIdAndCurrentTrue(profileId, period.id()).stream()
              .anyMatch(row -> affected.contains(row.getType()))) {
        throw new FrozenPeriodMutationException(profileId, period.getYear(), period.getMonth());
      }
    }
    for (var period : chain) {
      // A no-revenue confirmation is about the changed month's own facts; later months keep theirs
      // so the automatic calculation chain is not broken by an earlier month's change.
      boolean activityConfirmationCleared =
          YearMonth.of(period.getYear(), period.getMonth()).equals(month)
              && period.clearActivityConfirmation();
      boolean[] hadCalculation = {false};
      affected.forEach(type -> calculations
          .findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(profileId, period.id(), type)
          .ifPresent(calculation -> {
            hadCalculation[0] = true;
            calculation.markStale();
            calculations.save(calculation);
          }));
      if (hadCalculation[0]) {
        staled.add(YearMonth.of(period.getYear(), period.getMonth()));
      }

      if (!affected.isEmpty() && period.getStatus() != PeriodStatus.OPEN) {
        period.markDirty();
      }
      if (!affected.isEmpty() || activityConfirmationCleared) {
        periods.save(period);
      }
      if (activityConfirmationCleared) {
        auditEvents.write(profileId, period.id(), "ACTIVITY_CONFIRMATION_CLEARED",
            change.name(), actor, Instant.now());
      }
      auditEvents.write(profileId, period.id(), "CALCULATION_INVALIDATED", change.name(), actor, Instant.now());
    }
    return staled;
  }

  private RyczaltPeriodEntity findLocked(long profileId, YearMonth month) {
    return periods
        .findLocked(profileId, month.getYear(), month.getMonthValue())
        .orElseThrow(() -> new IllegalArgumentException("Period does not exist: " + month));
  }

  private static void requireReason(String reason) {
    if (reason == null || reason.isBlank())
      throw new IllegalArgumentException("Reason is required");
  }
}
