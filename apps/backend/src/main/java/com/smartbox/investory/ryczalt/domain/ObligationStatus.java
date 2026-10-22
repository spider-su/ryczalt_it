package com.smartbox.investory.ryczalt.domain;

import java.math.BigDecimal;

public enum ObligationStatus {
  OPEN,
  PARTIALLY_PAID,
  PAID,
  OVERPAID,
  FROZEN;

  public static ObligationStatus fromPayments(
      BigDecimal expected, BigDecimal paid, BigDecimal tolerance) {
    if (paid.signum() == 0) return OPEN;
    BigDecimal difference = paid.subtract(expected);
    if (difference.signum() > 0) return OVERPAID;
    if (difference.abs().compareTo(tolerance) <= 0) return PAID;
    return PARTIALLY_PAID;
  }
}
