package com.smartbox.investory.ryczalt.calculation.rules;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/** Test copy of the rule sets seeded in V01.001, effective from 2026-01 with no later rule set. */
public final class TestTaxRules {
  public static final YearMonth EFFECTIVE_FROM = YearMonth.of(2026, 1);

  public static final ZusRuleSet ZUS_2026 = new ZusRuleSet(
      "ZUS_2026_POC_V1",
      new BigDecimal("1649.82"),
      new BigDecimal("138.47"),
      new BigDecimal("138.47"),
      new BigDecimal("60000"),
      new BigDecimal("300000"),
      new BigDecimal("498.35"),
      new BigDecimal("830.58"),
      new BigDecimal("1495.04"));

  public static final RyczaltRuleSet RYCZALT_2026 = new RyczaltRuleSet(
      "RYCZALT_2026_POC_V1", new BigDecimal("0.50"), List.of(new BigDecimal("0.12")));

  public static final VatRuleSet VAT_2026 = new VatRuleSet("VAT_2026_POC_V1");

  private TestTaxRules() {}

  /** Same semantics as the database: 2026 rules apply from 2026-01 onward, earlier months fail. */
  public static TaxRuleSets from2026() {
    return new TaxRuleSets() {
      @Override
      public ZusRuleSet zus(YearMonth month) {
        require("ZUS", month);
        return ZUS_2026;
      }

      @Override
      public RyczaltRuleSet ryczalt(YearMonth month) {
        require("RYCZALT", month);
        return RYCZALT_2026;
      }

      @Override
      public VatRuleSet vat(YearMonth month) {
        require("VAT", month);
        return VAT_2026;
      }
    };
  }

  private static void require(String type, YearMonth month) {
    if (month.isBefore(EFFECTIVE_FROM))
      throw new IllegalArgumentException("No " + type + " tax rule set is effective for " + month);
  }
}
