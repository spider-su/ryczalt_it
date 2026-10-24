package com.smartbox.investory.ryczalt.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartbox.investory.notifications.Notifier;
import com.smartbox.investory.ryczalt.application.RyczaltMonthEndReminderService.MonthSummary;
import com.smartbox.investory.ryczalt.application.RyczaltMonthEndReminderService.Obligation;
import com.smartbox.investory.ryczalt.persistence.RyczaltNativeMonthInputJpaRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class RyczaltMonthEndReminderServiceTest {
  private static final YearMonth OCTOBER = YearMonth.of(2026, 10);

  @Test
  void calculatedMonthListsTheThreePaymentsAndPendingApprovals() {
    String text = RyczaltMonthEndReminderService.format(OCTOBER, new MonthSummary(
        "CALCULATED", 1, new BigDecimal("12300"), 2,
        List.of(
            new Obligation("RYCZALT", new BigDecimal("1476.0000"), "PLN", LocalDate.of(2026, 11, 20)),
            new Obligation("VAT", new BigDecimal("2829"), "PLN", LocalDate.of(2026, 11, 25)),
            new Obligation("ZUS", new BigDecimal("2108.37"), "PLN", LocalDate.of(2026, 11, 20))),
        null));

    assertThat(text)
        .startsWith("📅 Month end · 2026-10")
        .contains("1️⃣ Issue your sales invoice for 2026-10.",
            "Income so far: 1 invoice, 12300.00 PLN net.",
            "• Ryczałt: 1476.00 PLN, due 2026-11-20",
            "• VAT: 2829.00 PLN, due 2026-11-25",
            "• ZUS: 2108.37 PLN, due 2026-11-20",
            "⚠️ 2 invoices need your approval.")
        .doesNotContain("blocked", "out of date");
  }

  @Test
  void emptyMonthAsksForInvoiceAndReportsBlockedCalculation() {
    String text = RyczaltMonthEndReminderService.format(OCTOBER,
        new MonthSummary("OPEN", 0, BigDecimal.ZERO, 0, List.of(), "Missing month settings"));

    assertThat(text).contains(
        "No income invoice is recorded for this month yet.",
        "Not calculated yet.",
        "⚠️ Calculation is blocked: Missing month settings");
  }

  @Test
  void dirtyPeriodIsFlagged() {
    String text = RyczaltMonthEndReminderService.format(OCTOBER,
        new MonthSummary("DIRTY", 1, BigDecimal.TEN, 1, List.of(), null));

    assertThat(text).contains("⚠️ 1 invoice needs your approval.", "out of date");
  }

  @Test
  void remindCatchesUpCalculationsThenNotifiesEachConfiguredProfile() {
    var inputs = mock(RyczaltNativeMonthInputJpaRepository.class);
    var calculation = mock(RyczaltAutoRecalculationService.class);
    var notifier = mock(Notifier.class);
    when(inputs.findConfiguredProfileIds()).thenReturn(List.of(1L, 2L));
    when(calculation.catchUp(1L))
        .thenReturn(new RyczaltAutoRecalculationService.Outcome(List.of(OCTOBER), null, null));
    when(calculation.catchUp(2L)).thenThrow(new IllegalStateException("boom"));
    var service = new RyczaltMonthEndReminderService(inputs, calculation, mock(JdbcTemplate.class), notifier) {
      @Override
      public MonthSummary summary(long profileId, YearMonth month, String blockedReason) {
        return new MonthSummary("CALCULATED", 0, BigDecimal.ZERO, 0, List.of(), blockedReason);
      }
    };

    service.remind(OCTOBER);

    verify(calculation).catchUp(1L);
    verify(notifier).notifyProfile(eq(1L), org.mockito.ArgumentMatchers.contains("Month end · 2026-10"));
    verify(notifier).notifyProfile(eq(2L), org.mockito.ArgumentMatchers.contains("Month end · 2026-10"));
    verify(notifier, never()).notifyOperators(org.mockito.ArgumentMatchers.anyString());
    verify(notifier, org.mockito.Mockito.times(2)).notifyProfile(anyLong(), org.mockito.ArgumentMatchers.anyString());
  }
}
