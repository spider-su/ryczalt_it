package com.smartbox.investory.ryczalt.calculation.zus;

import java.math.BigDecimal;

public record ZusCalculationInput(
    boolean jdgActive,
    boolean qualifyingUop,
    String zusRegime,
    boolean voluntarySickness,
    BigDecimal ytdRyczaltRevenue,
    BigDecimal fullJdgSocial,
    HealthBand explicitHealthBand,
    BigDecimal socialContributionDeduction,
    BigDecimal healthContributionOverride,
    BigDecimal healthContributionPaidOverride) {
  public ZusCalculationInput {
    if (ytdRyczaltRevenue == null) throw new IllegalArgumentException("Cumulative ryczałt revenue is required");
    // fullJdgSocial and explicitHealthBand may be null: the calculator resolves them from the
    // ZUS rule set effective for the month.
    if (socialContributionDeduction != null && socialContributionDeduction.signum() < 0)
      throw new IllegalArgumentException("socialContributionDeduction must not be negative");
    if (healthContributionOverride != null && healthContributionOverride.signum() < 0)
      throw new IllegalArgumentException("healthContributionOverride must not be negative");
    if (healthContributionPaidOverride != null && healthContributionPaidOverride.signum() < 0)
      throw new IllegalArgumentException("healthContributionPaidOverride must not be negative");
  }

  public ZusCalculationInput(
      boolean jdgActive,
      boolean qualifyingUop,
      String zusRegime,
      boolean voluntarySickness,
      BigDecimal ytdRyczaltRevenue,
      BigDecimal fullJdgSocial,
      HealthBand explicitHealthBand) {
    this(
        jdgActive,
        qualifyingUop,
        zusRegime,
        voluntarySickness,
        ytdRyczaltRevenue,
        fullJdgSocial,
        explicitHealthBand,
        null,
        null,
        null);
  }

  public ZusCalculationInput(
      boolean jdgActive,
      boolean qualifyingUop,
      String zusRegime,
      boolean voluntarySickness,
      BigDecimal ytdRyczaltRevenue,
      BigDecimal fullJdgSocial,
      HealthBand explicitHealthBand,
      BigDecimal socialContributionDeduction,
      BigDecimal healthContributionOverride) {
    this(
        jdgActive,
        qualifyingUop,
        zusRegime,
        voluntarySickness,
        ytdRyczaltRevenue,
        fullJdgSocial,
        explicitHealthBand,
        socialContributionDeduction,
        healthContributionOverride,
        null);
  }

  public ZusCalculationInput(
      boolean jdgActive,
      boolean qualifyingUop,
      String zusRegime,
      boolean voluntarySickness,
      BigDecimal ytdRyczaltRevenue,
      BigDecimal fullJdgSocial) {
    this(
        jdgActive,
        qualifyingUop,
        zusRegime,
        voluntarySickness,
        ytdRyczaltRevenue,
        fullJdgSocial,
        null,
        null,
        null,
        null);
  }
}
