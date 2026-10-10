package com.smartbox.investory.integrations.ksef;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;

/** Transport-neutral extraction of KSeF document numbers from invoice metadata pages. */
public final class KsefInvoiceMetadata {
  private static final ObjectMapper JSON = new ObjectMapper();

  private KsefInvoiceMetadata() {}

  public static List<String> extractKsefNumbers(String metadataJson) {
    if (metadataJson == null || metadataJson.isBlank())
      throw new IllegalStateException("KSeF returned empty invoice metadata");
    try {
      JsonNode root = JSON.readTree(metadataJson);
      JsonNode invoices = root.path("invoices");
      if (!invoices.isArray())
        throw new IllegalStateException("KSeF invoice metadata has no invoices array");
      List<String> numbers = new ArrayList<>();
      for (JsonNode invoice : invoices) {
        String number = invoice.path("ksefNumber").asText("").trim();
        if (number.isBlank())
          throw new IllegalStateException("KSeF invoice metadata has no document number");
        numbers.add(number);
      }
      return numbers;
    } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
      throw new IllegalStateException("KSeF returned invalid invoice metadata", exception);
    }
  }
}
