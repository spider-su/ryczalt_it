package com.smartbox.investory.ryczalt.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.calculation.rules.TestTaxRules;
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
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class RyczaltRevenueForecastServiceTest {
  private final RyczaltNativeMonthInputJpaRepository inputs = mock();
  private final RyczaltInvoiceJpaRepository invoices = mock();
  private final JdbcTemplate jdbc = mock();
  private final RyczaltRevenueForecastService service =
      new RyczaltRevenueForecastService(inputs, invoices, TestTaxRules.from2026(), jdbc);

  @Test
  void priorYearRevenueComesFromOpeningStateAndApprovedIncomeWhenHistoryCoversIt() {
    opening(LocalDate.of(2026, 7, 1), "100000");
    var history = List.of(
        income(LocalDate.of(2026, 8, 31), "150000.50", ApprovalStatus.APPROVED),
        income(LocalDate.of(2026, 9, 30), "70000", ApprovalStatus.APPROVED),
        income(LocalDate.of(2026, 10, 31), "1000", ApprovalStatus.NEEDS_REVIEW),
        income(LocalDate.of(2027, 1, 31), "20000", ApprovalStatus.APPROVED));
    when(invoices.findByProfileIdOrderByAccountingDateAscIdAsc(7L)).thenReturn(history);

    var forecast = service.forecast(7L, 2027);

    assertEquals("HISTORY", forecast.priorYearSource());
    assertEquals(0, new BigDecimal("320000.50").compareTo(forecast.priorYearRevenue()));
    assertEquals(1, forecast.pendingPriorYearInvoices());
    assertEquals(0, new BigDecimal("20000").compareTo(forecast.ytdRevenue()));
    assertEquals("HIGH", forecast.predictedHealthBand());
    assertEquals(0, new BigDecimal("1495.04").compareTo(forecast.predictedMonthlyHealth()));
    assertEquals("ZUS_2026_POC_V1", forecast.zusRuleVersion());
  }

  @Test
  @SuppressWarnings("unchecked")
  void usesTheDeclaredValueOnlyWhenHistoryDoesNotCoverThePriorYear() {
    opening(LocalDate.of(2026, 7, 1), "100000");
    when(jdbc.query(anyString(), any(RowMapper.class), eq(7L), eq(2025)))
        .thenReturn(List.of(new BigDecimal("55000")));

    var forecast = service.forecast(7L, 2026);

    assertEquals("DECLARED", forecast.priorYearSource());
    assertEquals("LOW", forecast.predictedHealthBand());
    assertThrows(IllegalArgumentException.class,
        () -> service.declarePriorYearRevenue(7L, 2027, new BigDecimal("1")));
    service.declarePriorYearRevenue(7L, 2026, new BigDecimal("55000"));
    verify(jdbc).update(anyString(), eq(7L), eq(new BigDecimal("55000")), eq(2025));
  }

  @Test
  void reportsMissingWithoutHistoryOrDeclaration() {
    when(inputs.findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(7L))
        .thenReturn(Optional.empty());
    var forecast = service.forecast(7L, 2026);
    assertEquals("MISSING", forecast.priorYearSource());
    assertNull(forecast.predictedHealthBand());
  }

  private void opening(LocalDate start, String openingYtdRevenue) {
    var opening = new RyczaltNativeMonthInputEntity(7L, YearMonth.from(start),
        new RyczaltNativeMonthInputService.Command(true, false, "JDG", false, null, null, null,
            null, null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, start,
            new BigDecimal(openingYtdRevenue), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO));
    when(inputs.findFirstByProfileIdAndAccountingStartDateIsNotNullOrderByYearAscMonthAsc(7L))
        .thenReturn(Optional.of(opening));
  }

  private static RyczaltInvoiceEntity income(LocalDate date, String net, ApprovalStatus status) {
    RyczaltInvoiceEntity invoice = mock();
    when(invoice.getDirection()).thenReturn(InvoiceDirection.INCOME);
    when(invoice.getAccountingDate()).thenReturn(date);
    when(invoice.getApprovalStatus()).thenReturn(status);
    when(invoice.getBookedNetPln()).thenReturn(new BigDecimal(net));
    return invoice;
  }
}
