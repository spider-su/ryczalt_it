package com.smartbox.investory.ryczalt.persistence;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.smartbox.investory.ryczalt.calculation.zus.HealthBand;
import com.smartbox.investory.testsupport.FastDatabase;
import com.smartbox.investory.testsupport.WorkerDatabase;
import java.math.BigDecimal;
import java.time.YearMonth;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class JdbcTaxRuleSetsIT {
  private static WorkerDatabase database;
  private static JdbcTemplate jdbc;
  private static JdbcTaxRuleSets rules;

  @BeforeAll
  static void setUp() {
    database = FastDatabase.scopedDatabase("tax-rule-sets");
    jdbc = new JdbcTemplate(new DriverManagerDataSource(
        database.jdbcUrl(), database.username(), database.password()));
    rules = new JdbcTaxRuleSets(jdbc);
  }

  @AfterAll
  static void tearDown() {
    if (database != null) database.close();
  }

  @Test
  void seededRulesApplyFromTheirMonthUntilReplacedAndFailBeforeTheFirst() {
    for (YearMonth month : new YearMonth[] {YearMonth.of(2026, 1), YearMonth.of(2027, 12)}) {
      var zus = rules.zus(month);
      assertEquals("ZUS_2026_POC_V1", zus.version());
      assertEquals(0, new BigDecimal("1788.29").compareTo(zus.fullJdgSocial()));
      assertEquals(HealthBand.MEDIUM, zus.healthBand(new BigDecimal("60000.01")));
      assertEquals(0, new BigDecimal("830.58").compareTo(zus.healthAmount(HealthBand.MEDIUM)));
      var ryczalt = rules.ryczalt(month);
      assertEquals("RYCZALT_2026_POC_V1", ryczalt.version());
      assertEquals(0, new BigDecimal("0.50").compareTo(ryczalt.healthDeductionRatio()));
      assertTrue(ryczalt.supportsRate(new BigDecimal("0.12")));
      assertEquals("VAT_2026_POC_V1", rules.vat(month).version());
    }
    assertEquals("ZUS_2025_POC_V1", rules.zus(YearMonth.of(2025, 12)).version());
    assertEquals(0, new BigDecimal("1384.97").compareTo(
        rules.zus(YearMonth.of(2025, 12)).healthAmount(HealthBand.HIGH)));
    assertThrows(IllegalArgumentException.class, () -> rules.zus(YearMonth.of(2024, 12)));
    assertThrows(IllegalArgumentException.class, () -> rules.ryczalt(YearMonth.of(2024, 12)));
    assertThrows(IllegalArgumentException.class, () -> rules.vat(YearMonth.of(2024, 12)));
  }

  @Test
  void newerRuleSetAppliesOnlyFromItsEffectiveMonth() {
    jdbc.update("""
        INSERT INTO ryczalt.ryczalt_tax_rule_set (rule_type, effective_from, rule_version, parameters)
        VALUES ('ZUS', DATE '2027-04-01', 'ZUS_2027_04_TEST',
          '{"socialInsurance":"1700.00","labourFund":"140.00","voluntarySickness":"140.00",
            "healthLowRevenueUpTo":"60000","healthMediumRevenueUpTo":"300000",
            "healthLow":"510.00","healthMedium":"850.00","healthHigh":"1530.00"}')
        """);
    try {
      assertEquals("ZUS_2026_POC_V1", rules.zus(YearMonth.of(2027, 3)).version());
      var april = rules.zus(YearMonth.of(2027, 4));
      assertEquals("ZUS_2027_04_TEST", april.version());
      assertEquals(0, new BigDecimal("1840.00").compareTo(april.fullJdgSocial()));
      assertEquals("ZUS_2027_04_TEST", rules.zus(YearMonth.of(2028, 1)).version());
      // Other rule types are independent and keep their own latest effective set.
      assertEquals("RYCZALT_2026_POC_V1", rules.ryczalt(YearMonth.of(2027, 4)).version());
    } finally {
      jdbc.update("DELETE FROM ryczalt.ryczalt_tax_rule_set WHERE rule_version = 'ZUS_2027_04_TEST'");
    }
  }

  @Test
  void ruleSetsMustStartOnTheFirstDayOfAMonthAndBeUniquePerMonth() {
    assertThrows(DataIntegrityViolationException.class, () -> jdbc.update("""
        INSERT INTO ryczalt.ryczalt_tax_rule_set (rule_type, effective_from, rule_version)
        VALUES ('VAT', DATE '2027-04-15', 'VAT_MID_MONTH')
        """));
    assertThrows(DataIntegrityViolationException.class, () -> jdbc.update("""
        INSERT INTO ryczalt.ryczalt_tax_rule_set (rule_type, effective_from, rule_version)
        VALUES ('VAT', DATE '2026-01-01', 'VAT_DUPLICATE_MONTH')
        """));
  }
}
