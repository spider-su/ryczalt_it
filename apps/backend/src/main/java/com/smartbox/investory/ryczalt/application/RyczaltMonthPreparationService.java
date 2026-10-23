package com.smartbox.investory.ryczalt.application;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.calculation.rules.TaxRuleSets;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Makes a month ready for calculation without user input: creates the accounting period and the
 * monthly settings row, copying the employment/insurance settings from the latest earlier month.
 *
 * <p>Only the settings carry forward (JDG active, qualifying UoP, ZUS regime, voluntary sickness,
 * and a full-JDG-social override within the same tax year). Paid amounts stay empty, so they are
 * assumed equal to the calculated obligation, and per-month corrections start at zero.
 */
@Service
public class RyczaltMonthPreparationService {
  static final String ACTOR = "system:month-preparation";

  private final RyczaltNativeMonthInputJpaRepository inputs;
  private final RyczaltPeriodJpaRepository periods;
  private final TaxRuleSets taxRules;
  private final RyczaltAuditEventWriter auditEvents;

  public RyczaltMonthPreparationService(
      RyczaltNativeMonthInputJpaRepository inputs,
      RyczaltPeriodJpaRepository periods,
      TaxRuleSets taxRules,
      RyczaltAuditEventWriter auditEvents) {
    this.inputs = inputs;
    this.periods = periods;
    this.taxRules = taxRules;
    this.auditEvents = auditEvents;
  }

  /** First accounting month of the profile, when the opening state is configured. */
  @Transactional(readOnly = true)
  public Optional<YearMonth> accountingStart(long profileId) {
    return inputs
        .findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(profileId)
        .map(row -> YearMonth.from(row.accountingStartDate()));
  }

  /**
   * Ensures the period and settings row exist for {@code month} (and any missing month between the
   * latest configured month and it).
   *
   * @return false when the month cannot be prepared: no opening state, before the accounting
   *     start, or no tax rule set effective for the month
   */
  @Transactional
  public boolean prepare(long profileId, YearMonth month) {
    YearMonth start = accountingStart(profileId).orElse(null);
    if (start == null || month.isBefore(start) || !taxRules.supports(month)) return false;
    if (inputs.findByProfileIdAndYearAndMonth(profileId, month.getYear(), month.getMonthValue())
        .isEmpty()) {
      RyczaltNativeMonthInputEntity latest = inputs
          .findEarlier(profileId, month.getYear(), month.getMonthValue(), PageRequest.of(0, 1))
          .stream()
          .findFirst()
          .orElse(null);
      if (latest == null) return false;
      for (YearMonth cursor = latest.yearMonth().plusMonths(1);
          !cursor.isAfter(month);
          cursor = cursor.plusMonths(1)) {
        inputs.save(new RyczaltNativeMonthInputEntity(profileId, cursor, carried(latest, cursor)));
        RyczaltPeriodEntity period = period(profileId, cursor);
        auditEvents.write(profileId, period.id(), "MONTH_INPUT_CARRIED",
            "Settings copied from " + latest.yearMonth(), ACTOR, Instant.now());
      }
    }
    period(profileId, month);
    return true;
  }

  static RyczaltNativeMonthInputService.Command carried(
      RyczaltNativeMonthInputEntity source, YearMonth target) {
    var zus = source.zusSettings();
    boolean sameYear = source.yearMonth().getYear() == target.getYear();
    return new RyczaltNativeMonthInputService.Command(
        zus.jdgActive(),
        zus.qualifyingUop(),
        zus.zusRegime(),
        zus.voluntarySickness(),
        null,
        sameYear ? zus.fullJdgSocial() : null,
        null,
        null,
        null,
        BigDecimal.ZERO,
        BigDecimal.ZERO,
        BigDecimal.ZERO);
  }

  private RyczaltPeriodEntity period(long profileId, YearMonth month) {
    return periods
        .findByProfileIdAndYearAndMonth(profileId, month.getYear(), month.getMonthValue())
        .orElseGet(() -> periods.save(new RyczaltPeriodEntity(
            profileId, month.getYear(), month.getMonthValue(), PeriodStatus.OPEN)));
  }
}
