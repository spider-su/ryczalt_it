package com.smartbox.investory.ryczalt.application;

import com.smartbox.investory.notifications.Notifier;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Last-day-of-month reminder: issue the sales invoice for the month and confirm the calculated
 * ryczałt, VAT and ZUS amounts. Calculations are brought up to date first.
 */
@Slf4j
@Service
public class RyczaltMonthEndReminderService {
  private final RyczaltNativeMonthInputJpaRepository monthInputs;
  private final RyczaltAutoRecalculationService autoCalculation;
  private final JdbcTemplate jdbc;
  private final Notifier notifier;

  public RyczaltMonthEndReminderService(
      RyczaltNativeMonthInputJpaRepository monthInputs,
      RyczaltAutoRecalculationService autoCalculation,
      JdbcTemplate jdbc,
      Notifier notifier) {
    this.monthInputs = monthInputs;
    this.autoCalculation = autoCalculation;
    this.jdbc = jdbc;
    this.notifier = notifier;
  }

  public record Obligation(String type, BigDecimal amount, String currency, LocalDate dueDate) {}

  public record MonthSummary(
      String periodStatus,
      int incomeInvoices,
      BigDecimal incomeNet,
      int needsReview,
      List<Obligation> obligations,
      String blockedReason) {}

  public void remind(YearMonth month) {
    for (Long profileId : monthInputs.findConfiguredProfileIds()) {
      try {
        String blocked = null;
        try {
          var outcome = autoCalculation.catchUp(profileId);
          if (month.equals(outcome.blockedMonth())) blocked = outcome.blockedReason();
        } catch (RuntimeException exception) {
          log.warn("Month-end catch-up failed for profile {}: {}", profileId, exception.getMessage());
        }
        notifier.notifyProfile(profileId, format(month, summary(profileId, month, blocked)));
      } catch (RuntimeException exception) {
        log.warn("Month-end reminder failed for profile {}: {}", profileId, exception.getMessage());
      }
    }
  }

  public MonthSummary summary(long profileId, YearMonth month, String blockedReason) {
    Object[] args = {profileId, month.getYear(), month.getMonthValue()};
    String status = jdbc.query(
            "SELECT status FROM ryczalt.ryczalt_period"
                + " WHERE profile_id = ? AND period_year = ? AND period_month = ?",
            (rs, row) -> rs.getString(1), args)
        .stream().findFirst().orElse(null);
    var invoices = jdbc.queryForMap(
        "SELECT count(*) FILTER (WHERE i.direction = 'INCOME') AS income,"
            + " coalesce(sum(i.booked_net_pln) FILTER (WHERE i.direction = 'INCOME'), 0) AS income_net,"
            + " count(*) FILTER (WHERE i.approval_status = 'NEEDS_REVIEW') AS review"
            + " FROM ryczalt.ryczalt_invoice i JOIN ryczalt.ryczalt_period p ON p.id = i.period_id"
            + " WHERE i.profile_id = ? AND p.period_year = ? AND p.period_month = ?",
        args);
    List<Obligation> obligations = jdbc.query(
        "SELECT o.obligation_type, o.amount, o.currency, o.due_date FROM ryczalt.ryczalt_obligation o"
            + " JOIN ryczalt.ryczalt_period p ON p.id = o.period_id"
            + " WHERE o.profile_id = ? AND p.period_year = ? AND p.period_month = ?"
            + " ORDER BY CASE o.obligation_type WHEN 'RYCZALT' THEN 1 WHEN 'VAT' THEN 2 ELSE 3 END",
        (rs, row) -> new Obligation(rs.getString(1), rs.getBigDecimal(2), rs.getString(3),
            rs.getObject(4, LocalDate.class)),
        args);
    return new MonthSummary(
        status,
        ((Number) invoices.get("income")).intValue(),
        (BigDecimal) invoices.get("income_net"),
        ((Number) invoices.get("review")).intValue(),
        obligations,
        blockedReason);
  }

  static String format(YearMonth month, MonthSummary summary) {
    StringBuilder text = new StringBuilder("📅 Month end · ").append(month);
    text.append("\n\n1️⃣ Issue your sales invoice for ").append(month).append('.');
    if (summary.incomeInvoices() == 0) {
      text.append("\nNo income invoice is recorded for this month yet.");
    } else {
      text.append("\nIncome so far: ").append(summary.incomeInvoices())
          .append(summary.incomeInvoices() == 1 ? " invoice, " : " invoices, ")
          .append(money(summary.incomeNet())).append(" PLN net.");
    }
    text.append("\n\n2️⃣ Confirm the calculations:");
    if (summary.obligations().isEmpty()) {
      text.append("\nNot calculated yet.");
    } else {
      for (Obligation obligation : summary.obligations()) {
        text.append("\n• ").append(label(obligation.type())).append(": ")
            .append(money(obligation.amount())).append(' ').append(obligation.currency());
        if (obligation.dueDate() != null) text.append(", due ").append(obligation.dueDate());
      }
    }
    if (summary.needsReview() > 0) {
      text.append("\n⚠️ ").append(summary.needsReview())
          .append(summary.needsReview() == 1 ? " invoice needs" : " invoices need")
          .append(" your approval.");
    }
    if (summary.blockedReason() != null) {
      text.append("\n⚠️ Calculation is blocked: ").append(summary.blockedReason());
    } else if ("DIRTY".equals(summary.periodStatus())) {
      text.append("\n⚠️ The calculation is out of date; open the app to recalculate.");
    }
    return text.toString();
  }

  private static String label(String type) {
    return switch (type) {
      case "RYCZALT" -> "Ryczałt";
      default -> type;
    };
  }

  private static String money(BigDecimal amount) {
    return (amount == null ? BigDecimal.ZERO : amount).setScale(2, RoundingMode.HALF_UP).toPlainString();
  }
}
