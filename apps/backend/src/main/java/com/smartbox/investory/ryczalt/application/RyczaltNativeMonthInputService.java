package com.smartbox.investory.ryczalt.application;

import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodLifecycleService;
import com.smartbox.investory.ryczalt.calculation.InputChange;
import com.smartbox.investory.ryczalt.calculation.rules.TaxRuleSets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RyczaltNativeMonthInputService {
  private final RyczaltNativeMonthInputJpaRepository inputs;
  private final RyczaltPeriodLifecycleService lifecycle;
  private final TaxRuleSets taxRules;
  private final RyczaltAutoRecalculationService autoRecalculation;

  @org.springframework.beans.factory.annotation.Autowired
  public RyczaltNativeMonthInputService(
      RyczaltNativeMonthInputJpaRepository inputs,
      RyczaltPeriodLifecycleService lifecycle,
      TaxRuleSets taxRules,
      RyczaltAutoRecalculationService autoRecalculation) {
    this.inputs = inputs;
    this.lifecycle = lifecycle;
    this.taxRules = taxRules;
    this.autoRecalculation = autoRecalculation;
  }

  /** Without automatic recalculation; changes only invalidate. */
  public RyczaltNativeMonthInputService(
      RyczaltNativeMonthInputJpaRepository inputs,
      RyczaltPeriodLifecycleService lifecycle,
      TaxRuleSets taxRules) {
    this(inputs, lifecycle, taxRules, null);
  }

  /** True when ZUS, ryczałt and VAT rule sets are all effective for the month. */
  public boolean supports(YearMonth month) {
    return taxRules.supports(month);
  }

  @Transactional
  public void save(long profileId, YearMonth month, Command command) {
    Objects.requireNonNull(month, "month");
    Objects.requireNonNull(command, "command");
    taxRules.requireSupported(month);
    // Paid social/health amounts are optional: when absent the calculation assumes the month's
    // calculated contribution obligation was paid in full.
    var configuredStart = inputs
        .findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(profileId)
        .orElse(null);
    if (command.accountingStartDate() == null && configuredStart == null)
      throw new IllegalArgumentException(
          "Configure accountingStartDate and all five opening balances on the start month before saving monthly inputs.");
    if (configuredStart != null && month.isBefore(YearMonth.from(configuredStart.accountingStartDate())))
      throw new IllegalArgumentException("Period is before the configured accounting start date");
    if (command.accountingStartDate() != null && !YearMonth.from(command.accountingStartDate()).equals(month))
      throw new IllegalArgumentException("Opening accounting state must be stored on its start month");
    if (command.accountingStartDate() != null) {
      if (configuredStart != null && !command.accountingStartDate().equals(configuredStart.accountingStartDate()))
        throw new IllegalArgumentException("Accounting start date is already configured and cannot be duplicated");
    }
    RyczaltNativeMonthInputEntity input =
        inputs
            .findByProfileIdAndYearAndMonth(profileId, month.getYear(), month.getMonthValue())
            .orElse(null);
    if (input == null) {
      var previous = inputs.findEarlier(profileId, month.getYear(), month.getMonthValue(),
              org.springframework.data.domain.PageRequest.of(0, 1))
          .stream().findFirst().map(RyczaltNativeMonthInputEntity::zusSettings).orElse(null);
      var created = new RyczaltNativeMonthInputEntity(profileId, month, command);
      inputs.save(created);
      if (previous != null) propagateSettings(profileId, month, previous, created.zusSettings());
      lifecycle.invalidateFrom(profileId, month, InputChange.ZUS_INPUT_CHANGED, "native-month-input");
      lifecycle.invalidateFrom(profileId, month, InputChange.RYCZALT_DEDUCTIONS_CHANGED, "native-month-input");
      lifecycle.invalidateFrom(profileId, month, InputChange.VAT_ADJUSTMENT_CHANGED, "native-month-input");
      if (command.accountingStartDate() != null)
        lifecycle.invalidateFrom(profileId, month, InputChange.ACCOUNTING_OPENING_STATE_CHANGED, "native-month-input");
      recalculate(profileId, month);
      return;
    }
    if (command.accountingStartDate() == null && input.accountingStartDate() != null) {
      command = command.withOpeningState(input);
    }
    var changes = input.changesComparedTo(command);
    var previous = input.zusSettings();
    input.update(command);
    inputs.save(input);
    propagateSettings(profileId, month, previous, input.zusSettings());
    for (var change : changes) {
      lifecycle.invalidateFrom(profileId, month, change, "native-month-input");
    }
    if (!changes.isEmpty()) recalculate(profileId, month);
  }

  /**
   * A settings change (e.g. UoP true to false) becomes the base for the following months: later
   * months that still carry the previous settings are updated, stopping at the first later month
   * with its own different settings. Their calculations are invalidated by the caller.
   */
  private void propagateSettings(
      long profileId,
      YearMonth month,
      RyczaltNativeMonthInputEntity.ZusSettings previous,
      RyczaltNativeMonthInputEntity.ZusSettings current) {
    if (sameInsuranceSettings(previous, current)) return;
    for (var later : inputs.findLater(profileId, month.getYear(), month.getMonthValue())) {
      if (!later.sameInsuranceSettingsAs(previous)) break;
      later.applyInsuranceSettings(current);
      inputs.save(later);
    }
  }

  private static boolean sameInsuranceSettings(
      RyczaltNativeMonthInputEntity.ZusSettings left, RyczaltNativeMonthInputEntity.ZusSettings right) {
    return left.jdgActive() == right.jdgActive()
        && left.qualifyingUop() == right.qualifyingUop()
        && Objects.equals(left.zusRegime(), right.zusRegime())
        && left.voluntarySickness() == right.voluntarySickness();
  }

  private void recalculate(long profileId, YearMonth month) {
    if (autoRecalculation != null) autoRecalculation.recalculateFromAfterCommit(profileId, month);
  }

  /**
   * Resolves {@code qualifyingUop} for a month whose request did not state it, by carrying the
   * value from the latest earlier month input of the profile. Fails closed when none exists.
   */
  @Transactional(readOnly = true)
  public boolean carriedQualifyingUop(long profileId, YearMonth month) {
    return inputs.findEarlier(profileId, month.getYear(), month.getMonthValue(),
            org.springframework.data.domain.PageRequest.of(0, 1))
        .stream()
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException(
            "qualifyingUop is required: no earlier month input to carry it from"))
        .zusSettings()
        .qualifyingUop();
  }

  @Transactional(readOnly = true)
  public InputSettings settings(long profileId, YearMonth month) {
    var opening = inputs.findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(profileId)
        .orElse(null);
    var input = inputs.findByProfileIdAndYearAndMonth(profileId, month.getYear(), month.getMonthValue())
        .orElse(null);
    List<String> missing = new ArrayList<>();
    if (opening == null) {
      missing.addAll(List.of("accountingStartDate", "openingYtdRevenue",
          "openingSocialContributionsPaid", "openingHealthContributionsPaid",
          "openingDeductionsConsumed", "openingVatCarryForward"));
    }
    // Paid health is optional (assumed equal to calculated health); social needs an explicit fact.
    if (input == null) missing.add("qualifyingUop");
    else if (input.socialContributionDeduction() == null) missing.add("socialContributionDeduction");
    Command command = null;
    if (input != null) {
      var zus = input.zusSettings();
      command = new Command(zus.jdgActive(), zus.qualifyingUop(), zus.zusRegime(),
          zus.voluntarySickness(), zus.ytdRyczaltRevenue(), zus.fullJdgSocial(),
          zus.socialContributionDeduction(), zus.healthContributionOverride(),
          zus.healthContributionPaidOverride(), input.deductionsAlreadyConsumed(),
          input.salesCorrections(), input.explicitVatAdjustments(), input.accountingStartDate(),
          input.openingYtdRevenue(), input.openingSocialContributionsPaid(),
          input.openingHealthContributionsPaid(), input.openingDeductionsConsumed(), input.openingVatCarryForward());
    }
    return new InputSettings(command, opening == null ? null : opening.accountingStartDate(), List.copyOf(missing));
  }

  public record InputSettings(Command settings, LocalDate configuredStartDate, List<String> missingFields) {}

  public record Command(
      boolean jdgActive,
      boolean qualifyingUop,
      String zusRegime,
      boolean voluntarySickness,
      java.math.BigDecimal ytdRyczaltRevenue,
      java.math.BigDecimal fullJdgSocial,
      java.math.BigDecimal socialContributionDeduction,
      java.math.BigDecimal healthContributionOverride,
      java.math.BigDecimal healthContributionPaidOverride,
      java.math.BigDecimal deductionsAlreadyConsumed,
      java.math.BigDecimal salesCorrections,
      java.math.BigDecimal explicitVatAdjustments,
      LocalDate accountingStartDate,
      java.math.BigDecimal openingYtdRevenue,
      java.math.BigDecimal openingSocialContributionsPaid,
      java.math.BigDecimal openingHealthContributionsPaid,
      java.math.BigDecimal openingDeductionsConsumed,
      java.math.BigDecimal openingVatCarryForward) {
    public Command(
        boolean jdgActive,
        boolean qualifyingUop,
        String zusRegime,
        boolean voluntarySickness,
        java.math.BigDecimal ytdRyczaltRevenue,
        java.math.BigDecimal fullJdgSocial,
        java.math.BigDecimal socialContributionDeduction,
        java.math.BigDecimal healthContributionOverride,
        java.math.BigDecimal healthContributionPaidOverride,
        java.math.BigDecimal deductionsAlreadyConsumed,
        java.math.BigDecimal salesCorrections,
        java.math.BigDecimal explicitVatAdjustments) {
      this(
          jdgActive,
          qualifyingUop,
          zusRegime,
          voluntarySickness,
          ytdRyczaltRevenue,
          fullJdgSocial,
          socialContributionDeduction,
          healthContributionOverride,
          healthContributionPaidOverride,
          deductionsAlreadyConsumed,
          salesCorrections,
          explicitVatAdjustments,
          null,
          null,
          null,
          null,
          null,
          null);
    }

    public Command(
        boolean jdgActive,
        boolean qualifyingUop,
        String zusRegime,
        boolean voluntarySickness,
        java.math.BigDecimal ytdRyczaltRevenue,
        java.math.BigDecimal fullJdgSocial,
        java.math.BigDecimal socialContributionDeduction,
        java.math.BigDecimal healthContributionOverride,
        java.math.BigDecimal deductionsAlreadyConsumed,
        java.math.BigDecimal salesCorrections,
        java.math.BigDecimal explicitVatAdjustments) {
      this(
          jdgActive,
          qualifyingUop,
          zusRegime,
          voluntarySickness,
          ytdRyczaltRevenue,
          fullJdgSocial,
          socialContributionDeduction,
          healthContributionOverride,
          null,
          deductionsAlreadyConsumed,
          salesCorrections,
          explicitVatAdjustments,
          null,
          null,
          null,
          null,
          null,
          null);
    }

    public Command {
      if (!"JDG".equals(zusRegime)) throw new IllegalArgumentException("Only zusRegime=JDG is supported");
      if (voluntarySickness && (!jdgActive || qualifyingUop))
        throw new IllegalArgumentException("Voluntary sickness requires active JDG primary insurance");
      if (ytdRyczaltRevenue != null) nonNegative(ytdRyczaltRevenue, "ytdRyczaltRevenue");
      deductionsAlreadyConsumed =
          nonNegative(deductionsAlreadyConsumed, "deductionsAlreadyConsumed");
      if (salesCorrections == null) throw new IllegalArgumentException("salesCorrections is required");
      if (explicitVatAdjustments == null) throw new IllegalArgumentException("explicitVatAdjustments is required");
      if (fullJdgSocial != null && fullJdgSocial.signum() < 0)
        throw new IllegalArgumentException("fullJdgSocial must not be negative");
      if (socialContributionDeduction != null && socialContributionDeduction.signum() < 0)
        throw new IllegalArgumentException("socialContributionDeduction must not be negative");
      if (healthContributionOverride != null && healthContributionOverride.signum() < 0)
        throw new IllegalArgumentException("healthContributionOverride must not be negative");
      if (healthContributionPaidOverride != null && healthContributionPaidOverride.signum() < 0)
        throw new IllegalArgumentException("healthContributionPaidOverride must not be negative");
      boolean hasOpeningState = accountingStartDate != null;
      if (hasOpeningState) {
        if (accountingStartDate.getYear() < 2025)
          throw new IllegalArgumentException("Opening accounting state before 2025 is not supported");
        openingYtdRevenue = nonNegative(openingYtdRevenue, "openingYtdRevenue");
        openingSocialContributionsPaid =
            nonNegative(openingSocialContributionsPaid, "openingSocialContributionsPaid");
        openingHealthContributionsPaid =
            nonNegative(openingHealthContributionsPaid, "openingHealthContributionsPaid");
        openingDeductionsConsumed =
            nonNegative(openingDeductionsConsumed, "openingDeductionsConsumed");
        openingVatCarryForward =
            nonNegative(openingVatCarryForward, "openingVatCarryForward");
      } else if (openingYtdRevenue != null
          || openingSocialContributionsPaid != null
          || openingHealthContributionsPaid != null
          || openingDeductionsConsumed != null
          || openingVatCarryForward != null) {
        throw new IllegalArgumentException(
            "Opening balances require accountingStartDate and all explicit opening values");
      }
    }

    private Command withOpeningState(RyczaltNativeMonthInputEntity existing) {
      return new Command(jdgActive, qualifyingUop, zusRegime, voluntarySickness, ytdRyczaltRevenue,
          fullJdgSocial, socialContributionDeduction, healthContributionOverride,
          healthContributionPaidOverride, deductionsAlreadyConsumed, salesCorrections,
          explicitVatAdjustments, existing.accountingStartDate(), existing.openingYtdRevenue(),
          existing.openingSocialContributionsPaid(), existing.openingHealthContributionsPaid(),
          existing.openingDeductionsConsumed(), existing.openingVatCarryForward());
    }

    private static java.math.BigDecimal nonNegative(java.math.BigDecimal value, String name) {
      if (value == null) throw new IllegalArgumentException(name + " is required; enter an explicit zero when applicable");
      if (value.signum() < 0) throw new IllegalArgumentException(name + " must not be negative");
      return value;
    }
  }
}
