package com.smartbox.investory.ryczalt.application;

import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodLifecycleService;
import com.smartbox.investory.ryczalt.calculation.InputChange;
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

  public RyczaltNativeMonthInputService(
      RyczaltNativeMonthInputJpaRepository inputs, RyczaltPeriodLifecycleService lifecycle) {
    this.inputs = inputs;
    this.lifecycle = lifecycle;
  }

  @Transactional
  public void save(long profileId, YearMonth month, Command command) {
    Objects.requireNonNull(month, "month");
    Objects.requireNonNull(command, "command");
    if (month.getYear() != 2026) throw new IllegalArgumentException("Only 2026 accounting inputs are supported");
    List<String> missing = new ArrayList<>();
    if (command.socialContributionDeduction() == null) missing.add("socialContributionDeduction");
    if (command.healthContributionPaidOverride() == null) missing.add("healthContributionPaidOverride");
    if (!missing.isEmpty()) throw new IllegalArgumentException(
        "Missing required monthly facts: " + String.join(", ", missing)
            + ". Enter actual paid amounts, including explicit zero when none were paid.");
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
      inputs.save(new RyczaltNativeMonthInputEntity(profileId, month, command));
      lifecycle.invalidateFrom(profileId, month, InputChange.ZUS_INPUT_CHANGED, "native-month-input");
      lifecycle.invalidateFrom(profileId, month, InputChange.RYCZALT_DEDUCTIONS_CHANGED, "native-month-input");
      lifecycle.invalidateFrom(profileId, month, InputChange.VAT_ADJUSTMENT_CHANGED, "native-month-input");
      if (command.accountingStartDate() != null)
        lifecycle.invalidateFrom(profileId, month, InputChange.ACCOUNTING_OPENING_STATE_CHANGED, "native-month-input");
      return;
    }
    if (command.accountingStartDate() == null && input.accountingStartDate() != null) {
      command = command.withOpeningState(input);
    }
    var changes = input.changesComparedTo(command);
    input.update(command);
    inputs.save(input);
    for (var change : changes) {
      lifecycle.invalidateFrom(profileId, month, change, "native-month-input");
    }
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
    if (input == null || input.socialContributionDeduction() == null) missing.add("socialContributionDeduction");
    if (input == null || input.healthContributionPaidOverride() == null) missing.add("healthContributionPaidOverride");
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
        if (accountingStartDate.getYear() != 2025 && accountingStartDate.getYear() != 2026)
          throw new IllegalArgumentException("Only 2025 or 2026 opening accounting state is supported");
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
