package com.smartbox.investory.ryczalt.application.ksef;

/**
 * Raised when a KSeF sync targets a profile whose NIP is not the taxpayer of the connected KSeF
 * context. Importing would copy another taxpayer's invoices into the profile.
 */
public class KsefProfileMismatchException extends IllegalStateException {
  public KsefProfileMismatchException(long profileId) {
    super("KSeF integration is not connected to profile " + profileId
        + ": the profile NIP does not match the KSeF taxpayer NIP");
  }
}
