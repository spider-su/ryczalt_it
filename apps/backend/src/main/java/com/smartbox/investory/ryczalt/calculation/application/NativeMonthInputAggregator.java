package com.smartbox.investory.ryczalt.calculation.application;

import com.smartbox.investory.ryczalt.application.NeedsReviewException;
import com.smartbox.investory.ryczalt.calculation.rules.TaxRuleSets;
import com.smartbox.investory.ryczalt.calculation.vat.VatCalculationInput;
import com.smartbox.investory.ryczalt.calculation.zus.ZusCalculationInput;
import com.smartbox.investory.ryczalt.domain.ApprovalStatus;
import com.smartbox.investory.ryczalt.persistence.InvoiceDirection;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Builds calculation facts from approved native invoices. Bank rows are not tax inputs. */
@Service
public class NativeMonthInputAggregator {
  private final RyczaltInvoiceJpaRepository invoices;
  private final RyczaltNativeMonthInputJpaRepository monthInputs;
  private final TaxRuleSets taxRules;

  public NativeMonthInputAggregator(
      RyczaltInvoiceJpaRepository invoices,
      RyczaltNativeMonthInputJpaRepository monthInputs,
      TaxRuleSets taxRules) {
    this.invoices = invoices;
    this.monthInputs = monthInputs;
    this.taxRules = taxRules;
  }

  public NativeMonthCalculationInput aggregate(long profileId, long periodId, YearMonth month) {
    var zusRules = taxRules.zus(month);
    RyczaltNativeMonthInputEntity opening = monthInputs
        .findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(profileId)
        .orElseThrow(() -> needsReview(month, "opening accounting state is not configured"));
    YearMonth start = YearMonth.from(opening.accountingStartDate());
    if (month.isBefore(start)) throw needsReview(month, "period is before the configured accounting start");
    RyczaltNativeMonthInputEntity settings = monthInputs
        .findByProfileIdAndYearAndMonth(profileId, month.getYear(), month.getMonthValue())
        .orElseThrow(() -> needsReview(month, "monthly paid contribution facts and ZUS settings are missing"));
    if (settings.socialContributionDeduction() == null) {
      throw needsReview(month, "actual paid social contribution amount is required; enter zero when none was paid");
    }
    // A missing paid-health override intentionally reaches ZusCalculator, which assumes the
    // calculated health contribution was paid. Explicit values, including zero, take precedence.
    RyczaltNativeMonthInputEntity.ZusSettings zus = settings.zusSettings();
    // An accounting start persists across years; YTD revenue and paid-social totals do not.
    boolean openingInTaxYear = start.getYear() == month.getYear();
    LocalDate yearStart = LocalDate.of(month.getYear(), 1, 1);
    LocalDate revenueStart = openingInTaxYear ? opening.accountingStartDate() : yearStart;
    YearMonth paidStart = openingInTaxYear ? start : YearMonth.from(yearStart);
    BigDecimal ytdRevenue = (openingInTaxYear ? opening.openingYtdRevenue() : BigDecimal.ZERO)
        .add(cumulativeManagedIncome(profileId, revenueStart, month));
    BigDecimal paidSocialYtd = (openingInTaxYear ? opening.openingSocialContributionsPaid() : BigDecimal.ZERO)
        .add(cumulativePaidSocial(profileId, paidStart, month));
    return aggregate(
        profileId,
        periodId,
        month,
        new ZusCalculationInput(
            zus.jdgActive(),
            zus.qualifyingUop(),
            zus.zusRegime(),
            zus.voluntarySickness(),
            ytdRevenue,
            zus.fullJdgSocial(),
            zusRules.healthBandAfterPaidSocial(ytdRevenue, paidSocialYtd),
            zus.socialContributionDeduction(),
            zus.healthContributionOverride(),
            zus.healthContributionPaidOverride()),
        settings.deductionsAlreadyConsumed(),
        settings.salesCorrections(),
        settings.explicitVatAdjustments(),
        month.equals(start) ? opening.openingVatCarryForward() : null,
        month.equals(start)
            ? openingDeductionCarryForward(opening, taxRules.ryczalt(month).healthDeductionRatio())
            : null);
  }

  public boolean hasRevenueInvoices(long profileId, long periodId) {
    return invoices.findByProfileIdAndPeriodIdOrderByAccountingDateAscIdAsc(profileId, periodId)
        .stream().anyMatch(invoice -> invoice.getDirection() == InvoiceDirection.INCOME);
  }

  private BigDecimal openingDeductionCarryForward(
      RyczaltNativeMonthInputEntity opening, BigDecimal healthDeductionRatio) {
    BigDecimal healthDeduction = com.smartbox.investory.ryczalt.calculation.RoundingPolicy
        .roundHealthDeduction(opening.openingHealthContributionsPaid().multiply(healthDeductionRatio));
    return opening.openingSocialContributionsPaid().add(healthDeduction)
        .subtract(opening.openingDeductionsConsumed()).max(BigDecimal.ZERO);
  }

  private BigDecimal cumulativeManagedIncome(long profileId, LocalDate startDate, YearMonth month) {
    return invoices.findByProfileIdOrderByAccountingDateAscIdAsc(profileId).stream()
        .filter(invoice -> invoice.getDirection() == InvoiceDirection.INCOME)
        .filter(invoice -> !invoice.getAccountingDate().isBefore(startDate))
        .filter(invoice -> !invoice.getAccountingDate().isAfter(month.atEndOfMonth()))
        .peek(invoice -> { if (invoice.getApprovalStatus() != ApprovalStatus.APPROVED)
          throw needsReview(month, "unapproved historical income invoice facts remain"); })
        .map(invoice -> { require(invoice.getBookedNetPln(), month, "historical income invoice has no booked PLN net amount"); return invoice.getBookedNetPln(); })
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private BigDecimal cumulativePaidSocial(long profileId, YearMonth start, YearMonth month) {
    BigDecimal result = BigDecimal.ZERO;
    for (YearMonth cursor = start; !cursor.isAfter(month); cursor = cursor.plusMonths(1)) {
      YearMonth requiredMonth = cursor;
      var row = monthInputs.findByProfileIdAndYearAndMonth(profileId, requiredMonth.getYear(), requiredMonth.getMonthValue())
          .orElseThrow(() -> needsReview(month, "historical monthly ZUS settings are missing for " + requiredMonth));
      // Without an actual paid amount the month's deductible social obligation is assumed paid.
      var zus = row.zusSettings();
      result = result.add(row.socialContributionDeduction() != null
          ? row.socialContributionDeduction()
          : taxRules.zus(requiredMonth).deductibleSocial(
              zus.jdgActive(), zus.qualifyingUop(), zus.voluntarySickness(), zus.fullJdgSocial()));
    }
    return result;
  }

  public NativeMonthCalculationInput aggregate(
      long profileId,
      long periodId,
      YearMonth month,
      ZusCalculationInput zus,
      BigDecimal deductionsAlreadyConsumed,
      BigDecimal salesCorrections,
      BigDecimal explicitVatAdjustments) {
    return aggregate(profileId, periodId, month, zus, deductionsAlreadyConsumed, salesCorrections,
        explicitVatAdjustments, null, BigDecimal.ZERO);
  }

  private NativeMonthCalculationInput aggregate(long profileId, long periodId, YearMonth month,
      ZusCalculationInput zus, BigDecimal deductionsAlreadyConsumed, BigDecimal salesCorrections,
      BigDecimal explicitVatAdjustments, BigDecimal openingCarryForward,
      BigDecimal deductionCarryForward) {
    List<RyczaltInvoiceEntity> rows =
        invoices.findByProfileIdAndPeriodIdOrderByAccountingDateAscIdAsc(profileId, periodId);
    List<RyczaltInvoiceEntity> unresolved =
        rows.stream().filter(row -> row.getApprovalStatus() != ApprovalStatus.APPROVED).toList();
    if (!unresolved.isEmpty()) {
      throw needsReview(month, "unapproved invoice facts remain");
    }

    Map<BigDecimal, BigDecimal> revenueByRate = new LinkedHashMap<>();
    BigDecimal outputVat = BigDecimal.ZERO;
    BigDecimal deductibleVat = BigDecimal.ZERO;
    for (RyczaltInvoiceEntity invoice : rows) {
      if (invoice.getDirection() == InvoiceDirection.INCOME) {
        require(invoice.getBookedNetPln(), month, "income invoice has no booked PLN net amount");
        require(invoice.getRyczaltRate(), month, "income invoice has no ryczałt rate");
        revenueByRate.merge(invoice.getRyczaltRate(), invoice.getBookedNetPln(), BigDecimal::add);
        if (invoice.getBookedVatPln() == null && invoice.getVatAmount().signum() != 0) {
          throw needsReview(month, "income invoice has no booked PLN VAT amount");
        }
        outputVat =
            outputVat.add(
                invoice.getBookedVatPln() == null ? BigDecimal.ZERO : invoice.getBookedVatPln());
      } else {
        require(invoice.getDeductibleVat(), month, "cost invoice has unresolved deductible VAT");
        deductibleVat = deductibleVat.add(invoice.getDeductibleVat());
      }
    }
    return new NativeMonthCalculationInput(
        revenueByRate,
        new VatCalculationInput(outputVat, salesCorrections, deductibleVat, explicitVatAdjustments,
            openingCarryForward),
        zus,
        deductionsAlreadyConsumed,
        deductionCarryForward);
  }

  private void require(BigDecimal value, YearMonth month, String message) {
    if (value == null) throw needsReview(month, message);
  }

  private NeedsReviewException needsReview(YearMonth month, String reason) {
    return new NeedsReviewException(month, reason);
  }
}
