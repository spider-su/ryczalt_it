package com.smartbox.investory.ryczalt.application;

public class RyczaltInvoiceNotFoundException extends RuntimeException {
  public RyczaltInvoiceNotFoundException(long profileId, long invoiceId) {
    super("Invoice " + invoiceId + " was not found for profile " + profileId);
  }
}
