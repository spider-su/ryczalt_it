package com.smartbox.investory.ryczalt.persistence;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.calculation.CalculationInvalidationPolicy;
import com.smartbox.investory.ryczalt.calculation.InputChange;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import java.time.Instant;
import java.time.YearMonth;
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
  public void invalidate(long profileId, YearMonth month, InputChange change, String actor) {
    invalidateFrom(profileId, month, change, actor);
  }

  @Transactional
  public void invalidateFrom(long profileId, YearMonth month, InputChange change, String actor) {
    Set<CalculationType> affected = CalculationInvalidationPolicy.affectedBy(change);
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
      boolean activityConfirmationCleared = period.clearActivityConfirmation();
      affected.forEach(type -> calculations
          .findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(profileId, period.id(), type)
          .ifPresent(calculation -> { calculation.markStale(); calculations.save(calculation); }));
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
