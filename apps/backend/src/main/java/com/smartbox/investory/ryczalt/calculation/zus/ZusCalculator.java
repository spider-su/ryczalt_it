package com.smartbox.investory.ryczalt.calculation.zus;

import com.smartbox.investory.ryczalt.calculation.RoundingPolicy;
import com.smartbox.investory.ryczalt.calculation.rules.ZusRuleSet;
import java.math.BigDecimal;
import java.util.Objects;

/** Pure ZUS calculation for the supported JDG/UoP cases, using the rule set effective for the month. */
public final class ZusCalculator {
  private final ZusRuleSet rules;

  public ZusCalculator(ZusRuleSet rules) {
    this.rules = Objects.requireNonNull(rules, "rules");
  }

  public ZusCalculationResult calculate(ZusCalculationInput input) {
    Objects.requireNonNull(input, "input");
    if (input.zusRegime() == null || input.zusRegime().isBlank()) {
      throw new IllegalArgumentException("zusRegime is required");
    }
    if (!"JDG".equals(input.zusRegime())) {
      throw new IllegalArgumentException("Unsupported ZUS regime: " + input.zusRegime());
    }
    if (input.voluntarySickness() && (!input.jdgActive() || input.qualifyingUop())) {
      throw new IllegalArgumentException("Voluntary sickness is supported only for active JDG primary insurance");
    }
    BigDecimal fullJdgSocial = input.fullJdgSocial() == null ? rules.fullJdgSocial() : input.fullJdgSocial();
    HealthBand band =
        input.explicitHealthBand() == null
            ? rules.healthBand(input.ytdRyczaltRevenue())
            : input.explicitHealthBand();
    BigDecimal social =
        input.jdgActive() && !input.qualifyingUop()
            ? fullJdgSocial.add(input.voluntarySickness() ? rules.voluntarySickness() : BigDecimal.ZERO)
            : BigDecimal.ZERO;
    BigDecimal calculatedDeductibleSocial =
        rules.deductibleSocial(
            input.jdgActive(), input.qualifyingUop(), input.voluntarySickness(), fullJdgSocial);
    // Simplification: when no actual paid amount is supplied, the contribution is assumed to be
    // paid in full, i.e. paid equals the calculated obligation for the month.
    BigDecimal paidSocial = input.socialContributionDeduction() == null
        ? calculatedDeductibleSocial
        : input.socialContributionDeduction();
    BigDecimal deductibleSocial = paidSocial.min(calculatedDeductibleSocial);
    BigDecimal health =
        input.jdgActive()
            ? input.healthContributionOverride() == null
                ? rules.healthAmount(band)
                : input.healthContributionOverride()
            : BigDecimal.ZERO;
    social = RoundingPolicy.roundZusContribution(social);
    health = RoundingPolicy.roundZusContribution(health);
    BigDecimal healthPaidForDeduction =
        RoundingPolicy.roundZusContribution(
            input.healthContributionPaidOverride() == null
                ? health
                : input.healthContributionPaidOverride());
    return new ZusCalculationResult(
        social,
        health,
        healthPaidForDeduction,
        RoundingPolicy.roundZusContribution(social.add(health)),
        RoundingPolicy.roundZusContribution(deductibleSocial),
        band,
        input.qualifyingUop() ? "UOP_PRIMARY_INSURANCE" : "JDG_PRIMARY_INSURANCE",
        rules.version());
  }
}
