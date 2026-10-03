package com.smartbox.investory.ryczalt.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.time.YearMonth;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ObligationDueDateCalculatorTest {
  @Test
  void usesTypeSpecificDayOfFollowingMonth() {
    assertEquals(
        LocalDate.of(2026, 2, 20),
        ObligationDueDateCalculator.calculate(YearMonth.of(2026, 1), ObligationType.RYCZALT));
    assertEquals(
        LocalDate.of(2026, 2, 25),
        ObligationDueDateCalculator.calculate(YearMonth.of(2026, 1), ObligationType.VAT));
  }

  @Test
  void movesWeekendAndHolidayDeadlineToNextWorkingDay() {
    assertEquals(
        LocalDate.of(2026, 6, 22),
        ObligationDueDateCalculator.calculate(YearMonth.of(2026, 5), ObligationType.ZUS));
    assertEquals(
        LocalDate.of(2026, 12, 28),
        ObligationDueDateCalculator.calculate(YearMonth.of(2026, 11), ObligationType.VAT));
  }

  @ParameterizedTest
  @CsvSource({
    "RYCZALT,2024-03,2024-04-22", // Saturday deadline
    "VAT,2024-04,2024-05-27", // Saturday deadline
    "VAT,2026-11,2026-12-28", // Christmas public holiday and weekend
    "RYCZALT,2026-12,2027-01-20", // year transition
    "VAT,2026-12,2027-01-25"
  })
  void handlesWeekendHolidayAndYearBoundaryCases(
      ObligationType type, YearMonth period, LocalDate expected) {
    assertEquals(expected, ObligationDueDateCalculator.calculate(period, type));
  }
}
