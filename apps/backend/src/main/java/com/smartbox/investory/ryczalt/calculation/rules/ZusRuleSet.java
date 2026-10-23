package com.smartbox.investory.ryczalt.calculation.rules;

import com.smartbox.investory.ryczalt.calculation.zus.HealthBand;
import java.math.BigDecimal;
import java.util.Objects;

/**
 * ZUS parameters effective from a month until a newer ZUS rule set takes over. Loaded from
 * {@code ryczalt.ryczalt_tax_rule_set}; never hard-coded per year.
 */
public record ZusRuleSet(
    String version,
    BigDecimal socialInsurance,
    BigDecimal labourFund,
    BigDecimal voluntarySickness,
    BigDecimal healthLowRevenueUpTo,
    BigDecimal healthMediumRevenueUpTo,
    BigDecimal healthLow,
    BigDecimal healthMedium,
    BigDecimal healthHigh) {
  public ZusRuleSet {
    Objects.requireNonNull(version, "version");
    nonNegative(socialInsurance, "socialInsurance");
    nonNegative(labourFund, "labourFund");
    nonNegative(voluntarySickness, "voluntarySickness");
    nonNegative(healthLowRevenueUpTo, "healthLowRevenueUpTo");
    nonNegative(healthMediumRevenueUpTo, "healthMediumRevenueUpTo");
    nonNegative(healthLow, "healthLow");
    nonNegative(healthMedium, "healthMedium");
    nonNegative(healthHigh, "healthHigh");
    if (healthMediumRevenueUpTo.compareTo(healthLowRevenueUpTo) < 0)
      throw new IllegalArgumentException("healthMediumRevenueUpTo must not be below healthLowRevenueUpTo");
  }

  /** Full monthly JDG social contribution including the labour fund. */
  public BigDecimal fullJdgSocial() {
    return socialInsurance.add(labourFund);
  }

  /** Deductible JDG social contribution (excluding the labour fund) owed for the month. */
  public BigDecimal deductibleSocial(
      boolean jdgActive, boolean qualifyingUop, boolean sickness, BigDecimal fullJdgSocial) {
    if (!jdgActive || qualifyingUop) return BigDecimal.ZERO;
    BigDecimal full = fullJdgSocial == null ? fullJdgSocial() : fullJdgSocial;
    return full.subtract(labourFund).add(sickness ? voluntarySickness : BigDecimal.ZERO);
  }

  public HealthBand healthBand(BigDecimal ytdRevenueAfterPaidSocial) {
    if (ytdRevenueAfterPaidSocial == null)
      throw new IllegalArgumentException("Year-to-date revenue is required to determine health band");
    if (ytdRevenueAfterPaidSocial.compareTo(healthLowRevenueUpTo) <= 0) return HealthBand.LOW;
    if (ytdRevenueAfterPaidSocial.compareTo(healthMediumRevenueUpTo) <= 0) return HealthBand.MEDIUM;
    return HealthBand.HIGH;
  }

  public HealthBand healthBandAfterPaidSocial(BigDecimal ytdRevenue, BigDecimal paidSocial) {
    if (ytdRevenue == null || paidSocial == null)
      throw new IllegalArgumentException("Revenue and paid social contributions are required");
    return healthBand(ytdRevenue.subtract(paidSocial).max(BigDecimal.ZERO));
  }

  public BigDecimal healthAmount(HealthBand band) {
    return switch (Objects.requireNonNull(band, "band")) {
      case LOW -> healthLow;
      case MEDIUM -> healthMedium;
      case HIGH -> healthHigh;
    };
  }

  static void nonNegative(BigDecimal value, String name) {
    if (value == null) throw new IllegalArgumentException(name + " is required");
    if (value.signum() < 0) throw new IllegalArgumentException(name + " must not be negative");
  }
}
