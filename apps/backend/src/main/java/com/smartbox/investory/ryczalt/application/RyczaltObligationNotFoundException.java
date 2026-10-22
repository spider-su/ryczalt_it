package com.smartbox.investory.ryczalt.application;

public class RyczaltObligationNotFoundException extends RuntimeException {
  public RyczaltObligationNotFoundException(long profileId, long obligationId) {
    super("Obligation " + obligationId + " was not found for profile " + profileId);
  }
}
