package com.smartbox.investory.ryczalt.application.bank;

/** Native Ryczalt bank acquisition boundary. */
public interface RyczaltBankApi {
  RyczaltBankImportResult importBank(
      long profileId, byte[] content, String filename, String contentType);
}
