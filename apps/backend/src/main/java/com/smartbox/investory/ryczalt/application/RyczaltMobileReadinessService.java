package com.smartbox.investory.ryczalt.application;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.calculation.InputChange;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import com.smartbox.investory.ryczalt.persistence.CalculationType;
import com.smartbox.investory.ryczalt.persistence.RyczaltCalculationJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Authoritative mobile readiness view over persisted profile and accounting facts. */
@Service
public class RyczaltMobileReadinessService {
  private final JdbcTemplate jdbc;
  private final RyczaltNativeMonthInputJpaRepository monthInputs;
  private final RyczaltPeriodJpaRepository periods;
  private final RyczaltInvoiceJpaRepository invoices;
  private final RyczaltCalculationJpaRepository calculations;
  private final RyczaltAuditEventWriter auditEvents;

  public RyczaltMobileReadinessService(
      JdbcTemplate jdbc,
      RyczaltNativeMonthInputJpaRepository monthInputs,
      RyczaltPeriodJpaRepository periods,
      RyczaltInvoiceJpaRepository invoices,
      RyczaltCalculationJpaRepository calculations,
      RyczaltAuditEventWriter auditEvents) {
    this.jdbc = jdbc;
    this.monthInputs = monthInputs;
    this.periods = periods;
    this.invoices = invoices;
    this.calculations = calculations;
    this.auditEvents = auditEvents;
  }

  @Transactional(readOnly = true)
  public Readiness readiness(long profileId, YearMonth month) {
    requireSupportedMonth(month);
    var identity = jdbc.queryForList(
        "SELECT p.name AS profile_name, rp.nip, rp.full_name "
            + "FROM ryczalt.portfolios p LEFT JOIN ryczalt.ryczalt_profile rp "
            + "ON rp.profile_id = p.id WHERE p.id = ?", profileId);
    Map<String, Object> profile = identity.isEmpty() ? Map.of() : identity.getFirst();
    boolean companyConfigured = present(profile.get("profile_name"))
        && present(profile.get("nip")) && present(profile.get("full_name"));
    var opening = monthInputs
        .findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(profileId)
        .orElse(null);
    var monthly = monthInputs
        .findByProfileIdAndYearAndMonth(profileId, month.getYear(), month.getMonthValue())
        .orElse(null);
    boolean accountingConfigured = opening != null
        && !month.isBefore(YearMonth.from(opening.accountingStartDate()));
    boolean zusConfigured = monthly != null
        && monthly.socialContributionDeduction() != null
        && monthly.healthContributionPaidOverride() != null;
    RyczaltPeriodEntity period = periods
        .findByProfileIdAndYearAndMonth(profileId, month.getYear(), month.getMonthValue())
        .orElse(null);
    List<RyczaltInvoiceEntity> periodInvoices = period == null ? List.of()
        : invoices.findByProfileIdAndPeriodIdOrderByAccountingDateAscIdAsc(profileId, period.id());
    String periodState;
    if (!accountingConfigured) periodState = "HISTORICAL_DATA_MISSING";
    else if (period != null && "NO_REVENUE".equals(period.getActivityConfirmationType()))
      periodState = "CONFIRMED_NO_ACTIVITY";
    else if (!periodInvoices.isEmpty()) periodState = "DATA_AVAILABLE";
    else periodState = "NO_DATA";

    boolean onboardingComplete = companyConfigured && accountingConfigured && zusConfigured;
    List<CalculationReadiness> calculationReadiness = period == null ? List.of()
        : List.of(CalculationType.RYCZALT, CalculationType.VAT, CalculationType.ZUS).stream()
            .map(type -> calculations
                .findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(profileId, period.id(), type)
                .map(row -> new CalculationReadiness(type.name(), "COMPLETE", List.of(), null))
                .orElseGet(() -> new CalculationReadiness(type.name(), "UNAVAILABLE",
                    List.of("CALCULATION_NOT_CURRENT"), "No current calculation is available")))
            .toList();

    List<ReadinessItem> items = List.of(
        new ReadinessItem("COMPANY_CONFIGURATION", status(companyConfigured),
            companyConfigured ? null : "CONTACT_ADMIN"),
        new ReadinessItem("ACCOUNTING_CONFIGURATION", status(accountingConfigured),
            accountingConfigured ? null : "CONFIGURE_ACCOUNTING_START"),
        new ReadinessItem("ZUS_CONFIGURATION", status(zusConfigured),
            zusConfigured ? null : "CONFIGURE_MONTHLY_INPUTS"),
        new ReadinessItem("PERIOD_DATA",
            periodState.equals("NO_DATA") || periodState.equals("HISTORICAL_DATA_MISSING")
                ? "ACTION_REQUIRED" : "COMPLETE",
            periodState.equals("NO_DATA") ? "ADD_INVOICE"
                : periodState.equals("HISTORICAL_DATA_MISSING") ? "CONFIGURE_ACCOUNTING_START" : null),
        new ReadinessItem("KSEF_CONNECTION", "OPTIONAL", null));
    return new Readiness(onboardingComplete, companyConfigured, accountingConfigured,
        zusConfigured, new KsefState("NOT_CONNECTED", "NOT_AVAILABLE"),
        new PeriodState(month.toString(), periodState,
            period == null ? null : period.getActivityConfirmationType()),
        calculationReadiness, items, false);
  }

  @Transactional
  public Confirmation confirmNoRevenue(long profileId, YearMonth month, String actor) {
    requireSupportedMonth(month);
    Objects.requireNonNull(actor, "actor");
    var period = periods.findLocked(profileId, month.getYear(), month.getMonthValue())
        .orElseGet(() -> periods.save(new RyczaltPeriodEntity(
            profileId, month.getYear(), month.getMonthValue(), PeriodStatus.OPEN)));
    if (period.getStatus().isFrozen())
      throw new IllegalStateException("Frozen period cannot be changed: " + month);
    boolean hasRevenue = invoices.findByProfileIdAndPeriodIdOrderByAccountingDateAscIdAsc(
            profileId, period.id()).stream()
        .anyMatch(invoice -> invoice.getDirection()
            == com.smartbox.investory.ryczalt.persistence.InvoiceDirection.INCOME);
    if (hasRevenue)
      throw new IllegalStateException("Cannot confirm no revenue while income invoices exist");
    if ("NO_REVENUE".equals(period.getActivityConfirmationType()))
      return new Confirmation("NO_REVENUE", period.getActivityConfirmedAt());
    Instant now = Instant.now();
    period.confirmNoRevenue(actor, now);
    periods.save(period);
    auditEvents.write(profileId, period.id(), "ACTIVITY_CONFIRMED_NO_REVENUE",
        "NO_REVENUE", actor, now);
    return new Confirmation("NO_REVENUE", period.getActivityConfirmedAt());
  }

  private static String status(boolean complete) {
    return complete ? "COMPLETE" : "ACTION_REQUIRED";
  }

  private static boolean present(Object value) {
    return value != null && !value.toString().isBlank();
  }

  private static void requireSupportedMonth(YearMonth month) {
    Objects.requireNonNull(month, "month");
    if (month.getYear() != 2026)
      throw new IllegalArgumentException("Only 2026 accounting readiness is supported");
  }

  public record Readiness(
      boolean onboardingComplete,
      boolean companyConfigured,
      boolean accountingConfigured,
      boolean zusConfigured,
      KsefState ksef,
      PeriodState period,
      List<CalculationReadiness> calculations,
      List<ReadinessItem> items,
      boolean showWelcome) {}
  public record KsefState(String configuration, String sync) {}
  public record PeriodState(String month, String state, String confirmationType) {}
  public record CalculationReadiness(
      String type, String status, List<String> issueCodes, String reason) {}
  public record ReadinessItem(String code, String status, String action) {}
  public record Confirmation(String type, Instant confirmedAt) {}
}
