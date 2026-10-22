package com.smartbox.investory.ryczalt.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ObligationStatusTest {
  @ParameterizedTest
  @CsvSource({
      "ZUS,100.04,100.00,PAID",
      "ZUS,100.00,99.01,PAID",
      "ZUS,100.00,100.99,PAID",
      "ZUS,100.00,99.00,PARTIALLY_PAID",
      "ZUS,100.00,101.00,OVERPAID",
      "ZUS,0.04,0.00,OPEN",
      "VAT,100.04,100.00,PARTIALLY_PAID",
      "RYCZALT,100.04,100.00,PARTIALLY_PAID",
      "VAT,100.00,100.04,OVERPAID"
  })
  void acceptsOnlyZusGroszDifferencesWithPaymentEvidence(
      ObligationType type, String due, String paid, ObligationStatus expected) {
    assertEquals(expected, ObligationStatus.fromPayments(type,
        new BigDecimal(due), new BigDecimal(paid), BigDecimal.ZERO));
  }
}
