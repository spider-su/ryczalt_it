package com.smartbox.investory.ryczalt.persistence;

import com.smartbox.investory.ryczalt.application.RyczaltNativeMonthInputService.Command;
import com.smartbox.investory.ryczalt.calculation.InputChange;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;

@Entity
@Table(name = "ryczalt_native_month_input", schema = "ryczalt")
public class RyczaltNativeMonthInputEntity extends RyczaltEntity {
  @Column(name = "profile_id", nullable = false)
  private long profileId;

  @Column(name = "tax_year", nullable = false)
  private int year;

  @Column(name = "tax_month", nullable = false)
  private int month;

  @Column(name = "jdg_active", nullable = false)
  private boolean jdgActive;

  @Column(name = "qualifying_uop", nullable = false)
  private boolean qualifyingUop;

  @Column(name = "zus_regime", length = 32)
  private String zusRegime;

  @Column(name = "voluntary_sickness", nullable = false)
  private boolean voluntarySickness;

  @Column(name = "ytd_ryczalt_revenue", precision = 19, scale = 4)
  private BigDecimal ytdRyczaltRevenue;

  @Column(name = "accounting_start_date") private LocalDate accountingStartDate;
  @Column(name = "opening_ytd_revenue", precision = 19, scale = 4) private BigDecimal openingYtdRevenue;
  @Column(name = "opening_social_contributions_paid", precision = 19, scale = 4)
  private BigDecimal openingSocialContributionsPaid;
  @Column(name = "opening_health_contributions_paid", precision = 19, scale = 4)
  private BigDecimal openingHealthContributionsPaid;
  @Column(name = "opening_deductions_consumed", precision = 19, scale = 4)
  private BigDecimal openingDeductionsConsumed;
  @Column(name = "opening_vat_carry_forward", precision = 19, scale = 4)
  private BigDecimal openingVatCarryForward;

  @Column(name = "full_jdg_social", precision = 19, scale = 4)
  private BigDecimal fullJdgSocial;

  @Column(name = "social_contribution_deduction", precision = 19, scale = 4)
  private BigDecimal socialContributionDeduction;

  @Column(name = "health_contribution_override", precision = 19, scale = 4)
  private BigDecimal healthContributionOverride;

  @Column(name = "health_contribution_paid_override", precision = 19, scale = 4)
  private BigDecimal healthContributionPaidOverride;

  @Column(name = "deductions_already_consumed", nullable = false, precision = 19, scale = 4)
  private BigDecimal deductionsAlreadyConsumed;

  @Column(name = "sales_corrections", nullable = false, precision = 19, scale = 4)
  private BigDecimal salesCorrections;

  @Column(name = "explicit_vat_adjustments", nullable = false, precision = 19, scale = 4)
  private BigDecimal explicitVatAdjustments;

  protected RyczaltNativeMonthInputEntity() {}

  public RyczaltNativeMonthInputEntity(long profileId, YearMonth month, Command command) {
    this.profileId = profileId;
    this.year = month.getYear();
    this.month = month.getMonthValue();
    update(command);
  }

  public void update(Command command) {
    this.jdgActive = command.jdgActive();
    this.qualifyingUop = command.qualifyingUop();
    this.zusRegime = command.zusRegime();
    this.voluntarySickness = command.voluntarySickness();
    this.ytdRyczaltRevenue = command.ytdRyczaltRevenue();
    this.fullJdgSocial = command.fullJdgSocial();
    this.socialContributionDeduction = command.socialContributionDeduction();
    this.healthContributionOverride = command.healthContributionOverride();
    this.healthContributionPaidOverride = command.healthContributionPaidOverride();
    this.deductionsAlreadyConsumed = command.deductionsAlreadyConsumed();
    this.salesCorrections = command.salesCorrections();
    this.explicitVatAdjustments = command.explicitVatAdjustments();
    this.accountingStartDate = command.accountingStartDate();
    this.openingYtdRevenue = command.openingYtdRevenue();
    this.openingSocialContributionsPaid = command.openingSocialContributionsPaid();
    this.openingHealthContributionsPaid = command.openingHealthContributionsPaid();
    this.openingDeductionsConsumed = command.openingDeductionsConsumed();
    this.openingVatCarryForward = command.openingVatCarryForward();
  }

  public Set<InputChange> changesComparedTo(Command command) {
    EnumSet<InputChange> changes = EnumSet.noneOf(InputChange.class);
    if (jdgActive != command.jdgActive()
        || qualifyingUop != command.qualifyingUop()
        || !java.util.Objects.equals(zusRegime, command.zusRegime())
        || voluntarySickness != command.voluntarySickness()
        || !sameAmount(ytdRyczaltRevenue, command.ytdRyczaltRevenue())
        || !sameAmount(fullJdgSocial, command.fullJdgSocial())
        || !sameAmount(socialContributionDeduction, command.socialContributionDeduction())
        || !sameAmount(healthContributionOverride, command.healthContributionOverride())
        || !sameAmount(healthContributionPaidOverride, command.healthContributionPaidOverride())) {
      changes.add(InputChange.ZUS_INPUT_CHANGED);
    }
    if (!sameAmount(deductionsAlreadyConsumed, command.deductionsAlreadyConsumed())) {
      changes.add(InputChange.RYCZALT_DEDUCTIONS_CHANGED);
    }
    if (!sameAmount(salesCorrections, command.salesCorrections())
        || !sameAmount(explicitVatAdjustments, command.explicitVatAdjustments())) {
      changes.add(InputChange.VAT_ADJUSTMENT_CHANGED);
    }
    if (!java.util.Objects.equals(accountingStartDate, command.accountingStartDate())
        || !sameAmount(openingYtdRevenue, command.openingYtdRevenue())
        || !sameAmount(openingSocialContributionsPaid, command.openingSocialContributionsPaid())
        || !sameAmount(openingHealthContributionsPaid, command.openingHealthContributionsPaid())
        || !sameAmount(openingDeductionsConsumed, command.openingDeductionsConsumed())
        || !sameAmount(openingVatCarryForward, command.openingVatCarryForward())) {
      changes.add(InputChange.ACCOUNTING_OPENING_STATE_CHANGED);
    }
    return Set.copyOf(changes);
  }

  private static boolean sameAmount(BigDecimal left, BigDecimal right) {
    if (left == right) return true;
    if (left == null || right == null) return false;
    return left.compareTo(right) == 0;
  }

  public ZusSettings zusSettings() {
    return new ZusSettings(
        jdgActive,
        qualifyingUop,
        zusRegime,
        voluntarySickness,
        ytdRyczaltRevenue,
        fullJdgSocial,
        socialContributionDeduction,
        healthContributionOverride,
        healthContributionPaidOverride);
  }

  public BigDecimal deductionsAlreadyConsumed() {
    return deductionsAlreadyConsumed;
  }

  public BigDecimal socialContributionDeduction() { return socialContributionDeduction; }
  public BigDecimal healthContributionPaidOverride() { return healthContributionPaidOverride; }

  public BigDecimal salesCorrections() {
    return salesCorrections;
  }

  public BigDecimal explicitVatAdjustments() {
    return explicitVatAdjustments;
  }

  public LocalDate accountingStartDate() { return accountingStartDate; }
  public BigDecimal openingYtdRevenue() { return openingYtdRevenue; }
  public BigDecimal openingSocialContributionsPaid() { return openingSocialContributionsPaid; }
  public BigDecimal openingHealthContributionsPaid() { return openingHealthContributionsPaid; }
  public BigDecimal openingDeductionsConsumed() { return openingDeductionsConsumed; }
  public BigDecimal openingVatCarryForward() { return openingVatCarryForward; }

  public record ZusSettings(
      boolean jdgActive,
      boolean qualifyingUop,
      String zusRegime,
      boolean voluntarySickness,
      BigDecimal ytdRyczaltRevenue,
      BigDecimal fullJdgSocial,
      BigDecimal socialContributionDeduction,
      BigDecimal healthContributionOverride,
      BigDecimal healthContributionPaidOverride) {}
}
