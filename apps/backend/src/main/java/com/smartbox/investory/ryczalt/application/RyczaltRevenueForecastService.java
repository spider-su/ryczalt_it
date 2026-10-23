package com.smartbox.investory.ryczalt.application;

import com.smartbox.investory.ryczalt.calculation.rules.TaxRuleSets;
import com.smartbox.investory.ryczalt.domain.ApprovalStatus;
import com.smartbox.investory.ryczalt.persistence.InvoiceDirection;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Previous-year revenue and the ZUS health band forecast for a tax year.
 *
 * <p>The previous year's revenue is taken from history (opening year-to-date revenue plus approved
 * income invoices) whenever the accounting history covers that year. Only when it does not, a value
 * declared on the profile is used. The forecast band applies the year's ZUS rule set to that
 * revenue; the monthly calculation itself still uses the actual year-to-date revenue.
 */
@Service
public class RyczaltRevenueForecastService {
  private final RyczaltNativeMonthInputJpaRepository monthInputs;
  private final RyczaltInvoiceJpaRepository invoices;
  private final TaxRuleSets taxRules;
  private final JdbcTemplate jdbc;

  public RyczaltRevenueForecastService(
      RyczaltNativeMonthInputJpaRepository monthInputs,
      RyczaltInvoiceJpaRepository invoices,
      TaxRuleSets taxRules,
      JdbcTemplate jdbc) {
    this.monthInputs = monthInputs;
    this.invoices = invoices;
    this.taxRules = taxRules;
    this.jdbc = jdbc;
  }

  @Transactional(readOnly = true)
  public RevenueForecast forecast(long profileId, int year) {
    int priorYear = year - 1;
    var opening = monthInputs
        .findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(profileId)
        .orElse(null);
    List<RyczaltInvoiceEntity> income = invoices.findByProfileIdOrderByAccountingDateAscIdAsc(profileId)
        .stream()
        .filter(invoice -> invoice.getDirection() == InvoiceDirection.INCOME)
        .toList();

    BigDecimal priorRevenue;
    String source;
    int pending = 0;
    if (historyCovers(opening, priorYear)) {
      Revenue history = revenue(opening, income, priorYear);
      priorRevenue = history.amount();
      pending = history.pending();
      source = "HISTORY";
    } else {
      priorRevenue = declared(profileId, priorYear);
      source = priorRevenue == null ? "MISSING" : "DECLARED";
    }
    BigDecimal ytdRevenue = historyCovers(opening, year) ? revenue(opening, income, year).amount() : null;

    YearMonth january = YearMonth.of(year, 1);
    String band = null;
    BigDecimal monthlyHealth = null;
    String ruleVersion = null;
    if (priorRevenue != null && taxRules.supports(january)) {
      var zus = taxRules.zus(january);
      var predicted = zus.healthBand(priorRevenue);
      band = predicted.name();
      monthlyHealth = zus.healthAmount(predicted);
      ruleVersion = zus.version();
    }
    return new RevenueForecast(year, priorYear, priorRevenue, source, pending, ytdRevenue, band,
        monthlyHealth, monthlyHealth == null ? null : monthlyHealth.multiply(BigDecimal.valueOf(12)),
        ruleVersion);
  }

  /** Declares the previous year's revenue; only allowed when history does not cover that year. */
  @Transactional
  public void declarePriorYearRevenue(long profileId, int year, BigDecimal revenue) {
    Objects.requireNonNull(revenue, "priorYearRevenue");
    if (revenue.signum() < 0) throw new IllegalArgumentException("priorYearRevenue must not be negative");
    int priorYear = year - 1;
    var opening = monthInputs
        .findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(profileId)
        .orElse(null);
    if (historyCovers(opening, priorYear))
      throw new IllegalArgumentException(
          "Revenue for " + priorYear + " is calculated from approved invoices and cannot be declared");
    jdbc.update("""
        INSERT INTO ryczalt.ryczalt_profile (profile_id, prior_year_revenue, prior_year_revenue_year)
        VALUES (?, ?, ?)
        ON CONFLICT (profile_id) DO UPDATE SET
          prior_year_revenue = EXCLUDED.prior_year_revenue,
          prior_year_revenue_year = EXCLUDED.prior_year_revenue_year,
          updated_at = CURRENT_TIMESTAMP
        """, profileId, revenue, priorYear);
  }

  /** History covers a year when the accounting start is in that year or earlier. */
  private static boolean historyCovers(RyczaltNativeMonthInputEntity opening, int year) {
    return opening != null && opening.accountingStartDate().getYear() <= year;
  }

  private static Revenue revenue(
      RyczaltNativeMonthInputEntity opening, List<RyczaltInvoiceEntity> income, int year) {
    LocalDate start = opening.accountingStartDate();
    boolean openingYear = start.getYear() == year;
    LocalDate from = openingYear ? start : LocalDate.of(year, 1, 1);
    LocalDate to = LocalDate.of(year, 12, 31);
    BigDecimal amount = openingYear && opening.openingYtdRevenue() != null
        ? opening.openingYtdRevenue() : BigDecimal.ZERO;
    int pending = 0;
    for (RyczaltInvoiceEntity invoice : income) {
      LocalDate date = invoice.getAccountingDate();
      if (date.isBefore(from) || date.isAfter(to)) continue;
      if (invoice.getApprovalStatus() != ApprovalStatus.APPROVED || invoice.getBookedNetPln() == null) {
        pending++;
        continue;
      }
      amount = amount.add(invoice.getBookedNetPln());
    }
    return new Revenue(amount, pending);
  }

  private BigDecimal declared(long profileId, int priorYear) {
    return jdbc.query(
            "SELECT prior_year_revenue FROM ryczalt.ryczalt_profile"
                + " WHERE profile_id = ? AND prior_year_revenue_year = ?",
            (row, index) -> row.getBigDecimal(1), profileId, priorYear)
        .stream()
        .findFirst()
        .orElse(null);
  }

  private record Revenue(BigDecimal amount, int pending) {}

  /**
   * @param priorYearRevenue revenue of {@code priorYear}; null when neither history nor a declared
   *     value exists
   * @param priorYearSource HISTORY (from approved invoices), DECLARED or MISSING
   * @param pendingPriorYearInvoices prior-year income invoices not yet approved (not counted)
   * @param ytdRevenue approved revenue of {@code year} so far, when history covers it
   * @param predictedHealthBand health band forecast for {@code year} from the prior-year revenue
   */
  public record RevenueForecast(
      int year,
      int priorYear,
      BigDecimal priorYearRevenue,
      String priorYearSource,
      int pendingPriorYearInvoices,
      BigDecimal ytdRevenue,
      String predictedHealthBand,
      BigDecimal predictedMonthlyHealth,
      BigDecimal predictedAnnualHealth,
      String zusRuleVersion) {}
}
