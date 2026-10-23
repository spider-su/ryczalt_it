package com.smartbox.investory.ryczalt.persistence;

import com.smartbox.investory.ryczalt.calculation.rules.RyczaltRuleSet;
import com.smartbox.investory.ryczalt.calculation.rules.TaxRuleSets;
import com.smartbox.investory.ryczalt.calculation.rules.VatRuleSet;
import com.smartbox.investory.ryczalt.calculation.rules.ZusRuleSet;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads effective-dated tax rule sets from {@code ryczalt.ryczalt_tax_rule_set}. The latest rule
 * set of a type whose {@code effective_from} is on or before the month applies.
 */
@Repository
public class JdbcTaxRuleSets implements TaxRuleSets {
  private static final String EFFECTIVE = """
      SELECT r.rule_version, p.key, p.value
      FROM ryczalt.ryczalt_tax_rule_set r
      LEFT JOIN LATERAL jsonb_each_text(r.parameters) p ON true
      WHERE r.id = (
        SELECT id FROM ryczalt.ryczalt_tax_rule_set
        WHERE rule_type = ? AND effective_from <= ?
        ORDER BY effective_from DESC LIMIT 1)
      """;

  private final JdbcTemplate jdbc;

  public JdbcTaxRuleSets(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public ZusRuleSet zus(YearMonth month) {
    Parameters p = load("ZUS", month);
    return new ZusRuleSet(p.version, p.decimal("socialInsurance"), p.decimal("labourFund"),
        p.decimal("voluntarySickness"), p.decimal("healthLowRevenueUpTo"),
        p.decimal("healthMediumRevenueUpTo"), p.decimal("healthLow"), p.decimal("healthMedium"),
        p.decimal("healthHigh"));
  }

  @Override
  public RyczaltRuleSet ryczalt(YearMonth month) {
    Parameters p = load("RYCZALT", month);
    return new RyczaltRuleSet(
        p.version, p.decimal("healthDeductionRatio"), p.decimals("supportedRates"));
  }

  @Override
  public VatRuleSet vat(YearMonth month) {
    return new VatRuleSet(load("VAT", month).version);
  }

  private Parameters load(String type, YearMonth month) {
    List<Map<String, Object>> rows = jdbc.queryForList(EFFECTIVE, type, month.atDay(1));
    if (rows.isEmpty())
      throw new IllegalArgumentException("No " + type + " tax rule set is effective for " + month
          + "; configure one effective from that month or earlier");
    Map<String, String> values = new HashMap<>();
    for (Map<String, Object> row : rows) {
      if (row.get("key") != null) values.put((String) row.get("key"), (String) row.get("value"));
    }
    return new Parameters(type, (String) rows.getFirst().get("rule_version"), values);
  }

  private record Parameters(String type, String version, Map<String, String> values) {
    BigDecimal decimal(String name) {
      String value = values.get(name);
      if (value == null || value.isBlank())
        throw new IllegalStateException(type + " rule set " + version + " is missing parameter " + name);
      try {
        return new BigDecimal(value.trim());
      } catch (NumberFormatException invalid) {
        throw new IllegalStateException(
            type + " rule set " + version + " has a non-numeric parameter " + name, invalid);
      }
    }

    /** Parses a JSON array of numbers or numeric strings, e.g. ["0.12"] or [0.12]. */
    List<BigDecimal> decimals(String name) {
      String value = values.get(name);
      if (value == null || value.isBlank())
        throw new IllegalStateException(type + " rule set " + version + " is missing parameter " + name);
      String body = value.trim().replaceAll("^\\[|\\]$", "");
      if (body.isBlank()) return List.of();
      return Arrays.stream(body.split(","))
          .map(item -> new BigDecimal(item.trim().replace("\"", "")))
          .toList();
    }
  }
}
