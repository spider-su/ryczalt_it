package com.smartbox.investory.ryczalt.calculation.application;

import com.smartbox.investory.ryczalt.calculation.InputFingerprint;
import com.smartbox.investory.ryczalt.calculation.ryczalt.RyczaltCalculationInput;
import com.smartbox.investory.ryczalt.calculation.ryczalt.RyczaltCalculationResult;
import com.smartbox.investory.ryczalt.calculation.ryczalt.RyczaltCalculator;
import com.smartbox.investory.ryczalt.calculation.vat.VatCalculationResult;
import com.smartbox.investory.ryczalt.calculation.vat.VatCalculator;
import com.smartbox.investory.ryczalt.calculation.zus.ZusCalculationResult;
import com.smartbox.investory.ryczalt.calculation.zus.ZusCalculator;
import com.smartbox.investory.ryczalt.domain.ObligationStatus;
import com.smartbox.investory.ryczalt.domain.ObligationType;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import com.smartbox.investory.ryczalt.persistence.CalculationType;
import com.smartbox.investory.ryczalt.persistence.RyczaltCalculationEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltCalculationJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltCalculationPersistenceAdapter;
import com.smartbox.investory.ryczalt.persistence.RyczaltObligationEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltObligationJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import com.smartbox.investory.ryczalt.settlement.SettlementService;
import com.smartbox.investory.shared.currency.CurrencyType;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Runs the complete native RYCZALT, VAT, ZUS and obligation cycle for one month. */
@Service
public class NativeMonthCalculationService {
  private static final String CALCULATOR_VERSION = "native-month-1";

  private final RyczaltPeriodJpaRepository periods;
  private final NativeMonthInputAggregator inputAggregator;
  private final RyczaltCalculationPersistenceAdapter calculations;
  private final RyczaltObligationJpaRepository obligations;
  private final SettlementService settlement;
  private final RyczaltCalculationJpaRepository calculationRows;
  private final ObjectMapper json;
  private final RyczaltNativeMonthInputJpaRepository monthInputs;

  @Autowired
  public NativeMonthCalculationService(
      RyczaltPeriodJpaRepository periods,
      NativeMonthInputAggregator inputAggregator,
      RyczaltCalculationPersistenceAdapter calculations,
      RyczaltObligationJpaRepository obligations,
      SettlementService settlement,
      RyczaltCalculationJpaRepository calculationRows,
      ObjectMapper json,
      RyczaltNativeMonthInputJpaRepository monthInputs) {
    this.periods = periods;
    this.inputAggregator = inputAggregator;
    this.calculations = calculations;
    this.obligations = obligations;
    this.settlement = settlement;
    this.calculationRows = calculationRows;
    this.json = Objects.requireNonNull(json, "json");
    this.monthInputs = monthInputs;
  }

  public NativeMonthCalculationService(RyczaltPeriodJpaRepository periods,
      NativeMonthInputAggregator inputAggregator, RyczaltCalculationPersistenceAdapter calculations,
      RyczaltObligationJpaRepository obligations, SettlementService settlement,
      RyczaltCalculationJpaRepository calculationRows, ObjectMapper json) {
    this(periods, inputAggregator, calculations, obligations, settlement, calculationRows, json, null);
  }

  @Transactional
  public NativeMonthCalculationResult calculateFromPersistedInvoices(
      long profileId, YearMonth month) {
    requireSupportedYear(month);
    RyczaltPeriodEntity period = period(profileId, month);
    if (!inputAggregator.hasRevenueInvoices(profileId, period.id())
        && !"NO_REVENUE".equals(period.getActivityConfirmationType())) {
      throw new com.smartbox.investory.ryczalt.application.NeedsReviewException(
          month, "explicit no-revenue confirmation is required when no income invoices exist");
    }
    NativeMonthCalculationInput input = inputAggregator.aggregate(profileId, period.id(), month);
    return calculate(profileId, month, input);
  }

  @Transactional
  public NativeMonthCalculationResult calculate(
      long profileId, YearMonth month, NativeMonthCalculationInput input) {
    requireSupportedYear(month);
    requireSupportedConfiguration(input);
    RyczaltPeriodEntity period = period(profileId, month);
    if (period.getStatus().isFrozen()) {
      throw new IllegalStateException("Frozen period cannot be recalculated: " + month);
    }

    String ryczaltRules = ruleVersion("RYCZALT", month);
    String vatRules = ruleVersion("VAT", month);
    String zusRules = ruleVersion("ZUS", month);
    ZusCalculationResult zusResult = new ZusCalculator(zusRules).calculate(input.zus());
    NativeMonthCalculationInput calculationInput = withHistoricalCarryForwards(profileId, month, input);
    RyczaltCalculationResult ryczaltResult =
        new RyczaltCalculator(ryczaltRules)
            .calculate(
                new RyczaltCalculationInput(
                    input.revenueByRate(),
                    zusResult.deductibleSocial(),
                    zusResult.healthPaidForDeduction(),
                    calculationInput.deductionsAlreadyConsumed(),
                    calculationInput.deductionCarryForward()));
    VatCalculationResult vatResult = new VatCalculator(vatRules).calculate(calculationInput.vat());

    RyczaltCalculationEntity ryczaltCalculation =
        save(
            period,
            profileId,
            CalculationType.RYCZALT,
            json(ryczaltResult),
            InputFingerprint.ryczalt(
                new RyczaltCalculationInput(
                    calculationInput.revenueByRate(),
                    zusResult.deductibleSocial(),
                    zusResult.healthPaidForDeduction(),
                    calculationInput.deductionsAlreadyConsumed(),
                    calculationInput.deductionCarryForward()),
                ryczaltRules),
            ryczaltRules);
    RyczaltCalculationEntity vatCalculation =
        save(
            period,
            profileId,
            CalculationType.VAT,
            json(vatResult),
            fingerprint(calculationInput.vat(), vatRules),
            vatRules);
    RyczaltCalculationEntity zusCalculation =
        save(
            period,
            profileId,
            CalculationType.ZUS,
            json(zusResult),
            fingerprint(calculationInput.zus(), zusRules),
            zusRules);

    upsertObligation(
        profileId,
        period,
        ObligationType.RYCZALT,
        ryczaltResult.calculatedTax(),
        ryczaltCalculation);
    upsertObligation(
        profileId, period, ObligationType.VAT, vatResult.calculatedVat(), vatCalculation);
    upsertObligation(profileId, period, ObligationType.ZUS, zusResult.total(), zusCalculation);
    period.markCalculated(java.time.Instant.now());
    periods.save(period);
    settlement.settlePeriod(profileId, month);
    return new NativeMonthCalculationResult(
        month,
        ryczaltResult.calculatedTax(),
        vatResult.calculatedVat(),
        zusResult.total(),
        ryczaltResult,
        vatResult,
        zusResult);
  }

  private static void requireSupportedConfiguration(NativeMonthCalculationInput input) {
    Objects.requireNonNull(input, "input");
    BigDecimal supportedRate = new BigDecimal("0.12");
    if (input.revenueByRate().keySet().stream()
        .anyMatch(rate -> rate == null || rate.compareTo(supportedRate) != 0)) {
      throw new IllegalArgumentException("Only the 12% ryczałt rate is supported");
    }
  }

  private static void requireSupportedYear(YearMonth month) {
    if (month.getYear() != 2026) throw new IllegalArgumentException("Only 2026 accounting calculations are supported");
  }

  private RyczaltPeriodEntity period(long profileId, YearMonth month) {
    return periods
        .findLocked(profileId, month.getYear(), month.getMonthValue())
        .orElseGet(
            () ->
                periods.save(
                    new RyczaltPeriodEntity(
                        profileId, month.getYear(), month.getMonthValue(), PeriodStatus.OPEN)));
  }

  private RyczaltCalculationEntity save(
      RyczaltPeriodEntity period,
      long profileId,
      CalculationType type,
      String result,
      String fingerprint,
      String ruleVersion) {
    return calculations.saveCurrent(
        period, profileId, type, result, fingerprint, ruleVersion, CALCULATOR_VERSION);
  }

  private void upsertObligation(
      long profileId,
      RyczaltPeriodEntity period,
      ObligationType type,
      BigDecimal amount,
      RyczaltCalculationEntity calculation) {
    List<RyczaltObligationEntity> existing =
        obligations.findByProfileIdAndPeriodIdOrderByTypeAsc(profileId, period.id());
    RyczaltObligationEntity obligation =
        existing.stream().filter(row -> row.getType() == type).findFirst().orElse(null);
    if (obligation == null) {
      obligations.save(
          new RyczaltObligationEntity(
              period,
              profileId,
              type,
              amount,
              CurrencyType.PLN,
              null,
              ObligationStatus.OPEN,
              calculation.getId()));
    } else {
      obligation.refreshCalculation(amount, calculation.getId());
      obligations.save(obligation);
    }
  }

  private String json(Object value) {
    try {
      return json.writeValueAsString(value);
    } catch (Exception exception) {
      throw new IllegalStateException("Could not serialize native calculation", exception);
    }
  }

  private String fingerprint(Object value, String ruleVersion) {
    return InputFingerprint.sha256(ruleVersion + "|" + json(value));
  }

  private String ruleVersion(String type, YearMonth month) {
    return type + "_2026_POC_V1";
  }

  private NativeMonthCalculationInput withHistoricalCarryForwards(
      long profileId, YearMonth month, NativeMonthCalculationInput input) {
    YearMonth previousMonth = month.minusMonths(1);
    YearMonth configuredStart = monthInputs == null ? null : monthInputs
        .findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(profileId)
        .map(row -> YearMonth.from(row.accountingStartDate())).orElse(null);
    boolean openingMonth = month.equals(configuredStart);
    var previousPeriod = openingMonth ? java.util.Optional.<RyczaltPeriodEntity>empty() : periods
            .findByProfileIdAndYearAndMonth(
                profileId, previousMonth.getYear(), previousMonth.getMonthValue());
    BigDecimal carry;
    BigDecimal deductionCarry;
    if (previousPeriod.isPresent()) {
      var previousVat = calculationRows.findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(
          profileId, previousPeriod.get().id(), CalculationType.VAT)
          .orElseThrow(() -> new IllegalStateException(
              "Previous VAT calculation is missing or stale for " + previousMonth));
      carry = readCarryForward(previousVat.getResultJson());
      var previousRyczalt = calculationRows.findByProfileIdAndPeriodIdAndTypeAndCurrentTrue(
          profileId, previousPeriod.get().id(), CalculationType.RYCZALT)
          .orElseThrow(() -> new IllegalStateException(
              "Previous ryczałt calculation is missing or stale for " + previousMonth));
      deductionCarry = readDeductionCarryForward(previousRyczalt.getResultJson());
    } else {
      carry = input.vat().carryForwardInputVat();
      if (carry == null || carry.signum() < 0) {
        throw new IllegalStateException("Opening VAT carry-forward is missing or invalid for " + month);
      }
      deductionCarry = input.deductionCarryForward();
      if (deductionCarry == null || deductionCarry.signum() < 0)
        throw new IllegalStateException("Opening deduction carry-forward is missing or invalid for " + month);
    }
    var vat = input.vat();
    var withCarry =
        new com.smartbox.investory.ryczalt.calculation.vat.VatCalculationInput(
            vat.outputVatBeforeCorrections(),
            vat.salesCorrections(),
            vat.deductibleInputVat(),
            vat.explicitAdjustments(),
            carry);
    return new NativeMonthCalculationInput(
        input.revenueByRate(), withCarry, input.zus(), input.deductionsAlreadyConsumed(), deductionCarry);
  }

  private BigDecimal readDeductionCarryForward(String resultJson) {
    try {
      JsonNode value = json.readTree(resultJson).get("deductionsCarryForward");
      if (value == null || !value.isNumber() || value.decimalValue().signum() < 0)
        throw new IllegalStateException("Previous ryczałt result is missing a valid deductionsCarryForward");
      return value.decimalValue();
    } catch (JacksonException exception) {
      throw new IllegalStateException("Previous ryczałt calculation result is not valid JSON", exception);
    }
  }

  private BigDecimal readCarryForward(String resultJson) {
    try {
      var result = json.readTree(resultJson);
      var carryForward = result.get("excessVatCarryForward");
      if (carryForward == null || !carryForward.isNumber()) {
        throw new IllegalStateException(
            "Previous VAT calculation is missing a numeric excessVatCarryForward");
      }
      BigDecimal amount = carryForward.decimalValue();
      if (amount.signum() < 0) throw new IllegalStateException("Previous VAT carry-forward is negative");
      return amount;
    } catch (JacksonException exception) {
      throw new IllegalStateException("Previous VAT calculation result is not valid JSON", exception);
    }
  }
}
