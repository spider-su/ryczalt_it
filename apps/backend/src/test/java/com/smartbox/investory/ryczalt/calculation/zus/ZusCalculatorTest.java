package com.smartbox.investory.ryczalt.calculation.zus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ZusCalculatorTest {
  private final ZusCalculator calculator = new ZusCalculator();

  @Test
  void calculatesJdgMediumSocialAndHealth() {
    ZusCalculationResult result =
        calculator.calculate(
            paidInput(true, false, "JDG", false, new BigDecimal("60000.01"), null, new BigDecimal("1649.82"), new BigDecimal("830.58")));

    assertAmount("1788.29", result.social());
    assertAmount("830.58", result.health());
    assertAmount("2618.87", result.total());
    assertAmount("1649.82", result.deductibleSocial());
    assertEquals(ZusRules2026.HealthBand.MEDIUM, result.healthBand());
  }

  @Test
  void handlesQualifyingUopAndInactiveJdg() {
    ZusCalculationResult uop =
        calculator.calculate(
            paidInput(true, true, "JDG", false, BigDecimal.ZERO, null, BigDecimal.ZERO, new BigDecimal("498.35")));
    ZusCalculationResult inactive =
        calculator.calculate(
            paidInput(false, false, "JDG", false, new BigDecimal("400000"), null, BigDecimal.ZERO, BigDecimal.ZERO));

    assertAmount("0", uop.social());
    assertAmount("498.35", uop.health());
    assertAmount("0", inactive.total());
    assertEquals(ZusRules2026.HealthBand.HIGH, inactive.healthBand());
  }

  @Test
  void rejectsUnsupportedInsuranceConfigurationsAndUnavailableRevenue() {
    assertThrows(
        IllegalArgumentException.class,
        () -> calculator.calculate(new ZusCalculationInput(true, false, null, false, BigDecimal.ZERO, null)));
    assertThrows(
        IllegalArgumentException.class,
        () -> new ZusCalculationInput(true, false, "JDG", false, null, null));
  }

  @Test
  void includesVoluntarySicknessInSocialAndDeductibleAmount() {
    ZusCalculationResult result =
        calculator.calculate(
            paidInput(true, false, "JDG", true, BigDecimal.ZERO, null, new BigDecimal("1788.29"), new BigDecimal("498.35")));

    assertAmount("1926.76", result.social());
    assertAmount("1788.29", result.deductibleSocial());
    assertEquals(ZusRules2026.VERSION, result.ruleVersion());
  }

  @Test
  void usesPersistedYearSpecificContributionAmountsWhenProvided() {
    ZusCalculationResult result =
        calculator.calculate(
            new ZusCalculationInput(
                true,
                false,
                "JDG",
                false,
                BigDecimal.ZERO,
                new BigDecimal("1646.47"),
                ZusRules2026.HealthBand.HIGH,
                new BigDecimal("1518.98"),
                new BigDecimal("1384.97"),
                new BigDecimal("1384.97")));

    assertAmount("1646.47", result.social());
    assertAmount("1384.97", result.health());
    assertAmount("3031.44", result.total());
    assertAmount("1508.00", result.deductibleSocial());
  }

  @Test
  void keepsPayableHealthSeparateFromPaidHealthUsedForRyczaltDeduction() {
    ZusCalculationResult result =
        calculator.calculate(
            new ZusCalculationInput(
                true,
                false,
                "JDG",
                false,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                ZusRules2026.HealthBand.HIGH,
                BigDecimal.ZERO,
                new BigDecimal("1495.04"),
                new BigDecimal("1384.98")));

    assertAmount("1495.04", result.health());
    assertAmount("1495.04", result.total());
    assertAmount("1384.98", result.healthPaidForDeduction());
  }

  @Test
  void requiresActualPaidFactsAndAcceptsExplicitZero() {
    assertThrows(IllegalArgumentException.class, () -> calculator.calculate(
        new ZusCalculationInput(true, false, "JDG", false, BigDecimal.ZERO, null)));
    var unpaid = calculator.calculate(paidInput(true, false, "JDG", false,
        BigDecimal.ZERO, null, BigDecimal.ZERO, BigDecimal.ZERO));
    assertAmount("0", unpaid.deductibleSocial());
    assertAmount("0", unpaid.healthPaidForDeduction());
    assertAmount("0", new com.smartbox.investory.ryczalt.calculation.ryczalt.RyczaltCalculator()
        .calculate(new com.smartbox.investory.ryczalt.calculation.ryczalt.RyczaltCalculationInput(
            java.util.Map.of(new BigDecimal("0.12"), new BigDecimal("10000")),
            unpaid.deductibleSocial(), unpaid.healthPaidForDeduction())).deductionsUsed());
  }

  @Test
  void rejectsUnsupportedRegimeAndInvalidVoluntarySicknessCombination() {
    assertThrows(IllegalArgumentException.class, () -> calculator.calculate(
        paidInput(true, false, "PREFERENTIAL", false, BigDecimal.ZERO, null,
            BigDecimal.ZERO, BigDecimal.ZERO)));
    assertThrows(IllegalArgumentException.class, () -> calculator.calculate(
        paidInput(false, false, "JDG", true, BigDecimal.ZERO, null,
            BigDecimal.ZERO, BigDecimal.ZERO)));
  }

  @Test
  void appliesHealthBandsAtInclusiveRevenueThresholdsAfterPaidSocial() {
    assertEquals(
        ZusRules2026.HealthBand.LOW,
        ZusRules2026.healthBand(new BigDecimal("60000.00")));
    assertEquals(
        ZusRules2026.HealthBand.MEDIUM,
        ZusRules2026.healthBand(new BigDecimal("60000.01")));
    assertEquals(
        ZusRules2026.HealthBand.MEDIUM,
        ZusRules2026.healthBand(new BigDecimal("300000.00")));
    assertEquals(
        ZusRules2026.HealthBand.HIGH,
        ZusRules2026.healthBand(new BigDecimal("300000.01")));
    assertEquals(
        ZusRules2026.HealthBand.LOW,
        ZusRules2026.healthBandAfterPaidSocial(
            new BigDecimal("60050"), new BigDecimal("50")));
  }

  private static void assertAmount(String expected, BigDecimal actual) {
    assertEquals(0, new BigDecimal(expected).compareTo(actual));
  }

  private static ZusCalculationInput paidInput(boolean active, boolean uop, String regime, boolean sickness,
      BigDecimal revenue, BigDecimal fullSocial, BigDecimal socialPaid, BigDecimal healthPaid) {
    return new ZusCalculationInput(active, uop, regime, sickness, revenue, fullSocial, null,
        socialPaid, null, healthPaid);
  }
}
