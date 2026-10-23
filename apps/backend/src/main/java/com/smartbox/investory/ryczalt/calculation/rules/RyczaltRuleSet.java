package com.smartbox.investory.ryczalt.calculation.rules;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/** Ryczałt parameters effective from a month until a newer ryczałt rule set takes over. */
public record RyczaltRuleSet(
    String version, BigDecimal healthDeductionRatio, List<BigDecimal> supportedRates) {
  public RyczaltRuleSet {
    Objects.requireNonNull(version, "version");
    ZusRuleSet.nonNegative(healthDeductionRatio, "healthDeductionRatio");
    if (healthDeductionRatio.compareTo(BigDecimal.ONE) > 0)
      throw new IllegalArgumentException("healthDeductionRatio must not exceed 1");
    if (supportedRates == null || supportedRates.isEmpty())
      throw new IllegalArgumentException("supportedRates must not be empty");
    supportedRates = List.copyOf(supportedRates);
  }

  public boolean supportsRate(BigDecimal rate) {
    return rate != null && supportedRates.stream().anyMatch(supported -> supported.compareTo(rate) == 0);
  }

  /** Human-readable rejection, e.g. "Only the 12% ryczałt rate is supported". */
  public String unsupportedRateMessage() {
    String rates = supportedRates.stream()
        .map(rate -> rate.movePointRight(2).stripTrailingZeros().toPlainString() + "%")
        .collect(Collectors.joining(", "));
    return supportedRates.size() == 1
        ? "Only the " + rates + " ryczałt rate is supported"
        : "Only the " + rates + " ryczałt rates are supported";
  }
}
