package com.smartbox.investory.ryczalt.calculation.rules;

import java.time.YearMonth;

/**
 * Resolves the tax rule sets effective for a month. A rule set applies from its effective month
 * until a rule set of the same type with a later effective month exists. Months before the first
 * rule set of a type are unsupported and fail closed with {@link IllegalArgumentException}.
 */
public interface TaxRuleSets {
  ZusRuleSet zus(YearMonth month);

  RyczaltRuleSet ryczalt(YearMonth month);

  VatRuleSet vat(YearMonth month);

  /** Fails closed unless ZUS, ryczałt and VAT rules are all effective for the month. */
  default void requireSupported(YearMonth month) {
    zus(month);
    ryczalt(month);
    vat(month);
  }

  default boolean supports(YearMonth month) {
    try {
      requireSupported(month);
      return true;
    } catch (IllegalArgumentException unsupported) {
      return false;
    }
  }
}
