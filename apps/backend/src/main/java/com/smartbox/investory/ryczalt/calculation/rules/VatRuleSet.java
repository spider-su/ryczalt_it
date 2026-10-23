package com.smartbox.investory.ryczalt.calculation.rules;

import java.util.Objects;

/** VAT rule set effective from a month until a newer VAT rule set takes over. */
public record VatRuleSet(String version) {
  public VatRuleSet {
    Objects.requireNonNull(version, "version");
  }
}
