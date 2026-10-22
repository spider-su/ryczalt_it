package com.smartbox.investory.ryczalt.domain;

import java.math.BigDecimal;

public enum ObligationStatus {
  OPEN,
  PARTIALLY_PAID,
  PAID,
  OVERPAID,
  FROZEN;

  public static ObligationStatus fromPayments(
      ObligationType type, BigDecimal expected, BigDecimal paid, BigDecimal tolerance) {
    if (paid.signum() == 0) return OPEN;
    BigDecimal difference = paid.subtract(expected);
    // ZUS reconciliation tolerates grosz differences, but never a full PLN or missing payment.
    if (type == ObligationType.ZUS && difference.abs().compareTo(BigDecimal.ONE) < 0) return PAID;
    if (difference.signum() > 0) return OVERPAID;
    if (type != ObligationType.ZUS && difference.abs().compareTo(tolerance) <= 0) return PAID;
    return PARTIALLY_PAID;
  }
}
