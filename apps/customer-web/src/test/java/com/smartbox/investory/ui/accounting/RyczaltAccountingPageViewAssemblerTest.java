package com.smartbox.investory.ui.accounting;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.Test;

class RyczaltAccountingPageViewAssemblerTest {
  @Test
  void bankRowsUseCounterpartyAliasAndShowWholeAmountAndAllocationStatus() {
    var counterparties =
        List.of(
            new RyczaltWebAccountingClient.Counterparty(
                1, "Żabka Sp. z o.o.", "Zabka", "Zabka", null, "PL", null, 1, 2));
    var transactions =
        List.of(
            new RyczaltWebAccountingClient.Transaction(
                7,
                LocalDate.of(2026, 9, 10),
                new BigDecimal("-99.60"),
                "PLN",
                "BANK-7",
                "ZABKA SP Z OO",
                "Invoice payment",
                new BigDecimal("50.00")));

    var rows = RyczaltAccountingPageViewAssembler.bankTransactionRows(counterparties, transactions);

    assertEquals(1, rows.size());
    assertEquals("Zabka", rows.getFirst().counterparty());
    assertEquals("-99,60 PLN", rows.getFirst().amount());
    assertEquals("Partially matched", rows.getFirst().status());
    assertEquals("Invoice payment", rows.getFirst().description());
  }

  @Test
  void bankRowsRetainUnknownCounterpartyAndReportUnmatchedStatus() {
    var transactions =
        List.of(
            new RyczaltWebAccountingClient.Transaction(
                8,
                LocalDate.of(2026, 9, 11),
                new BigDecimal("125.00"),
                "EUR",
                "BANK-8",
                "Unlisted Client",
                null,
                BigDecimal.ZERO));

    var rows = RyczaltAccountingPageViewAssembler.bankTransactionRows(List.of(), transactions);

    assertEquals("Unlisted Client", rows.getFirst().counterparty());
    assertEquals("125,00 EUR", rows.getFirst().amount());
    assertEquals("Unmatched", rows.getFirst().status());
    assertEquals(null, rows.getFirst().description());
  }

  @Test
  void taxCardsRequireSettledAmountsAndRevenueMismatchIsVisible() {
    YearMonth month = YearMonth.of(2026, 8);
    var period =
        new RyczaltWebAccountingClient.Period(
            month,
            "OPEN",
            List.of(),
            new RyczaltWebAccountingClient.Summary(new BigDecimal("39949.00"), new BigDecimal("100"), new BigDecimal("50"), new BigDecimal("20")),
            new RyczaltWebAccountingClient.Audit(
                new BigDecimal("59444"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO),
            new RyczaltWebAccountingClient.Documents(2, 0),
            new RyczaltWebAccountingClient.Settlement(
                3, 0, 3, new BigDecimal("170"), BigDecimal.ZERO, new BigDecimal("170"), false),
            new RyczaltWebAccountingClient.Reconciliation(0, 0, 0, 0),
            new RyczaltWebAccountingClient.Completeness("INCOMPLETE", 1),
            List.of());
    var obligations =
        List.of(
            obligation("RYCZALT", "100", "0", "100", "OPEN", false),
            obligation("VAT", "50", "50", "0", "PAID", false),
            obligation("ZUS", "20", "0", "20", "PARTIALLY_PAID", false));

    var page =
        new RyczaltAccountingPageViewAssembler()
            .assemble(
                month, List.of(new RyczaltWebAccountingClient.Month(month, "OPEN")), period,
                List.of(), List.of(), List.of(), obligations, List.of(), List.of(), List.of(),
                false, LocalDate.of(2026, 9, 27));

    assertEquals("○ Unpaid", taxCard(page, "Ryczalt").status());
    assertEquals("✓ Paid", taxCard(page, "VAT").status());
    assertEquals("○ Unpaid", taxCard(page, "ZUS").status());
    assertEquals("100,00 PLN", taxCard(page, "Ryczalt").calculated());
    assertEquals(1, page.issues().stream().filter(i -> i.code().equals("REVENUE_MISMATCH")).count());
  }

  @Test
  void taxCardWithUnknownOutstandingAmountIsNotMarkedPaid() {
    var page =
        new RyczaltAccountingPageViewAssembler()
            .assemble(
                YearMonth.of(2026, 8), List.of(), period(YearMonth.of(2026, 8)), List.of(),
                List.of(), List.of(),
                List.of(obligation("RYCZALT", "100", "0", null, "PAID", false)),
                List.of(), List.of(), List.of(), false, LocalDate.of(2026, 9, 27));

    assertEquals("○ Unpaid", taxCard(page, "Ryczalt").status());
  }

  @Test
  void moneyUsesPolishDecimalsAndRetainsGrosze() {
    String display = RyczaltAccountingPageViewAssembler.money(new BigDecimal("1234.50"), "PLN");

    assertEquals("1 234,50 PLN", display.replace('\u00a0', ' ').replace('\u202f', ' '));
  }

  @Test
  void bankTransactionsUseCurrentMonthIncomeAndNextMonthPayments() {
    var currentIncome = transaction(1, LocalDate.of(2026, 2, 3), new BigDecimal("100.00"));
    var currentPayment = transaction(2, LocalDate.of(2026, 2, 4), new BigDecimal("-50.00"));
    var nextIncome = transaction(3, LocalDate.of(2026, 3, 3), new BigDecimal("200.00"));
    var nextPayment = transaction(4, LocalDate.of(2026, 3, 4), new BigDecimal("-75.00"));

    var result =
        RyczaltAccountingPageViewAssembler.bankTransactionsForDisplay(
            List.of(currentIncome, currentPayment), List.of(nextIncome, nextPayment));

    assertEquals(List.of(currentIncome, nextPayment), result);
  }

  private static RyczaltWebAccountingClient.Transaction transaction(
      long id, LocalDate date, BigDecimal amount) {
    return new RyczaltWebAccountingClient.Transaction(
        id, date, amount, "PLN", "BANK-" + id, "Counterparty", null, BigDecimal.ZERO);
  }

  private static RyczaltWebAccountingClient.Obligation obligation(
      String type, String expected, String paid, String outstanding, String status, boolean manual) {
    return new RyczaltWebAccountingClient.Obligation(
        1, type, new BigDecimal(expected), new BigDecimal(paid),
        outstanding == null ? null : new BigDecimal(outstanding), "PLN", null, status, manual, null);
  }

  private static RyczaltWebAccountingClient.Period period(YearMonth month) {
    return new RyczaltWebAccountingClient.Period(
        month, "OPEN", List.of(),
        new RyczaltWebAccountingClient.Summary(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO),
        new RyczaltWebAccountingClient.Audit(
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.ZERO),
        new RyczaltWebAccountingClient.Documents(0, 0),
        new RyczaltWebAccountingClient.Settlement(0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, true),
        new RyczaltWebAccountingClient.Reconciliation(0, 0, 0, 0),
        new RyczaltWebAccountingClient.Completeness("COMPLETE", 0), List.of());
  }

  private static RyczaltAccountingPageViewAssembler.TaxCard taxCard(
      RyczaltAccountingPageViewAssembler.PageView page, String type) {
    return page.taxCards().stream().filter(card -> card.type().equals(type)).findFirst().orElseThrow();
  }
}
