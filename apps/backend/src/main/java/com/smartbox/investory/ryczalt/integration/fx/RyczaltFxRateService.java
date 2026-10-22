package com.smartbox.investory.ryczalt.integration.fx;

import com.smartbox.investory.ryczalt.persistence.RyczaltFxRateJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltFxResolutionJpaRepository;
import com.smartbox.investory.shared.currency.CurrencyType;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads historical facts first and acquires a missing fact exactly once. */
@Service
public class RyczaltFxRateService {
  private final RyczaltFxRateJpaRepository rates;
  private final RyczaltFxResolutionJpaRepository resolutions;
  private final FxRateSourcePort source;
  private final Clock clock;

  public RyczaltFxRateService(
      RyczaltFxRateJpaRepository rates,
      RyczaltFxResolutionJpaRepository resolutions,
      FxRateSourcePort source,
      Clock clock) {
    this.rates = rates;
    this.resolutions = resolutions;
    this.source = source;
    this.clock = clock;
  }

  @Transactional
  public FxRate rateFor(String currency, LocalDate accountingDate) {
    String code = currency.toUpperCase(Locale.ROOT);
    CurrencyType currencyType = CurrencyType.valueOf(code);
    LocalDate requestedDate = FxRateDatePolicy.priorBusinessDay(accountingDate);
    return resolutions
        .findByProviderAndCurrencyAndRequestedDate(
            NbpFxRateAdapter.PROVIDER, currencyType, requestedDate)
        .map(
            stored ->
                new FxRate(
                    stored.getCurrency().name(),
                    requestedDate,
                    stored.getEffectiveDate(),
                    stored.getRate(),
                    stored.getProvider(),
                    stored.getProviderReference()))
        .orElseGet(() -> persist(source.fetch(code, requestedDate), requestedDate));
  }

  /** Prefills NBP observations and date resolutions for one accounting month. */
  @Transactional
  public FxRateRefreshResult refreshMonth(YearMonth month) {
    LocalDate from = month.atDay(1);
    LocalDate to = month.atEndOfMonth();
    List<FxRate> history = source.fetchHistory(from.minusDays(7), to);
    var byCurrency = new java.util.EnumMap<CurrencyType, List<FxRate>>(CurrencyType.class);
    for (FxRate rate : history) {
      CurrencyType currency = CurrencyType.valueOf(rate.currency());
      if (currency == CurrencyType.PLN
          || !NbpFxRateAdapter.PROVIDER.equals(rate.provider())
          || rate.effectiveDate().isBefore(from.minusDays(7))
          || rate.effectiveDate().isAfter(to)
          || rate.rate() == null
          || rate.rate().signum() <= 0) {
        throw new IllegalArgumentException("NBP returned an invalid monthly FX observation");
      }
      byCurrency.computeIfAbsent(currency, ignored -> new java.util.ArrayList<>()).add(rate);
    }

    Instant now = Instant.now(clock);
    int insertedRates = 0;
    int insertedResolutions = 0;
    int observationsConsidered = 0;
    for (CurrencyType currency : List.of(CurrencyType.EUR, CurrencyType.USD)) {
      List<FxRate> observations = byCurrency.getOrDefault(currency, List.of()).stream()
          .sorted(java.util.Comparator.comparing(FxRate::effectiveDate))
          .toList();
      if (observations.isEmpty()) {
        throw new IllegalStateException("NBP returned no " + currency + " monthly rates");
      }
      observationsConsidered += observations.size();
      for (FxRate observation : observations) {
        insertedRates +=
            rates.insertIfAbsent(
                currency.name(),
                observation.effectiveDate(),
                observation.rate(),
                observation.provider(),
                observation.providerReference(),
                now);
      }
      for (LocalDate requestedDate = from;
          !requestedDate.isAfter(to);
          requestedDate = requestedDate.plusDays(1)) {
        LocalDate resolutionDate = requestedDate;
        FxRate observation =
            observations.stream()
                .filter(rate -> !rate.effectiveDate().isAfter(resolutionDate))
                .max(java.util.Comparator.comparing(FxRate::effectiveDate))
                .orElseThrow(
                    () ->
                        new IllegalStateException(
                            "NBP has no " + currency + " rate on or before " + resolutionDate));
        insertedResolutions +=
            resolutions.insertIfAbsent(
                currency.name(),
                resolutionDate,
                observation.effectiveDate(),
                observation.rate(),
                observation.provider(),
                observation.providerReference(),
                now);
      }
    }
    return new FxRateRefreshResult(month, history.size(), insertedRates, insertedResolutions,
        observationsConsidered - insertedRates, month.lengthOfMonth() * 2 - insertedResolutions);
  }

  private FxRate persist(FxRate acquired, LocalDate requestedDate) {
    CurrencyType currency = CurrencyType.valueOf(acquired.currency());
    Instant now = Instant.now(clock);
    rates.insertIfAbsent(
        currency.name(),
        acquired.effectiveDate(),
        acquired.rate(),
        acquired.provider(),
        acquired.providerReference(),
        now);
    var stored =
        rates
            .findByProviderAndCurrencyAndEffectiveDate(
                acquired.provider(), currency, acquired.effectiveDate())
            .orElseThrow();
    resolutions.insertIfAbsent(
        currency.name(),
        requestedDate,
        stored.getEffectiveDate(),
        stored.getRate(),
        stored.getProvider(),
        stored.getProviderReference(),
        now);
    var resolved =
        resolutions
            .findByProviderAndCurrencyAndRequestedDate(acquired.provider(), currency, requestedDate)
            .orElseThrow();
    return new FxRate(
        resolved.getCurrency().name(),
        requestedDate,
        resolved.getEffectiveDate(),
        resolved.getRate(),
        resolved.getProvider(),
        resolved.getProviderReference());
  }

  public record FxRateRefreshResult(
      YearMonth month, int observationsReceived, int ratesInserted, int resolutionsInserted,
      int ratesUnchanged, int resolutionsUnchanged) {
    public String outcome() {
      return ratesInserted == 0 && resolutionsInserted == 0 ? "NO_NEW_DATA" : "UPDATED";
    }
  }
}
