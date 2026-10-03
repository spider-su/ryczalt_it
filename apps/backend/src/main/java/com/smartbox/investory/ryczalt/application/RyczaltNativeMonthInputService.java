package com.smartbox.investory.ryczalt.application;

import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodLifecycleService;
import com.smartbox.investory.ryczalt.calculation.InputChange;
import java.time.YearMonth;
import java.time.LocalDate;
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
    if (command.accountingStartDate() != null && !YearMonth.from(command.accountingStartDate()).equals(month))
      throw new IllegalArgumentException("Opening accounting state must be stored on its start month");
    if (command.accountingStartDate() != null) {
      var configuredStart = inputs
          .findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(profileId)
          .orElse(null);
      if (configuredStart != null && !command.accountingStartDate().equals(configuredStart.accountingStartDate()))
        throw new IllegalArgumentException("Accounting start date is already configured and cannot be duplicated");
    }
    RyczaltNativeMonthInputEntity input =
        inputs
            .findByProfileIdAndYearAndMonth(profileId, month.getYear(), month.getMonthValue())
            .orElse(null);
    if (input == null) {
      inputs.save(new RyczaltNativeMonthInputEntity(profileId, month, command));
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
      Objects.requireNonNull(salesCorrections, "salesCorrections");
      Objects.requireNonNull(explicitVatAdjustments, "explicitVatAdjustments");
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
        if (accountingStartDate.getYear() != 2026) throw new IllegalArgumentException("Only 2026 opening accounting state is supported");
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
      Objects.requireNonNull(value, name);
      if (value.signum() < 0) throw new IllegalArgumentException(name + " must not be negative");
      return value;
    }
  }
}
