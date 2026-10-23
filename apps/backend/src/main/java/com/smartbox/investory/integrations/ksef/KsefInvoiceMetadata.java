package com.smartbox.investory.integrations.ksef;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Transport-neutral extraction of KSeF document numbers from invoice metadata pages. */
public final class KsefInvoiceMetadata {
  private static final ObjectMapper JSON = new ObjectMapper();

  private KsefInvoiceMetadata() {}

  public static List<InvoiceMetadata> extractInvoices(String metadataJson) {
    if (metadataJson == null || metadataJson.isBlank())
      throw new IllegalStateException("KSeF returned empty invoice metadata");
    try {
      JsonNode root = JSON.readTree(metadataJson);
      JsonNode invoices = root.path("invoices");
      if (!invoices.isArray())
        throw new IllegalStateException("KSeF invoice metadata has no invoices array");
      List<InvoiceMetadata> numbers = new ArrayList<>();
      for (JsonNode invoice : invoices) {
        String number = invoice.path("ksefNumber").asText("").trim();
        if (number.isBlank())
          throw new IllegalStateException("KSeF invoice metadata has no document number");
        numbers.add(new InvoiceMetadata(number, amount(invoice, "netAmount"),
            amount(invoice, "vatAmount"), amount(invoice, "grossAmount")));
      }
      return numbers;
    } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
      throw new IllegalStateException("KSeF returned invalid invoice metadata", exception);
    }
  }
  private static BigDecimal amount(JsonNode node, String field) {
    JsonNode value = node.get(field);
    if (value == null || value.isNull()) return null;
    try { return new BigDecimal(value.asText()); }
    catch (NumberFormatException exception) {
      throw new IllegalStateException("KSeF returned an invalid invoice amount: " + field, exception);
    }
  }

  public record InvoiceMetadata(String ksefNumber, BigDecimal netAmount,
      BigDecimal vatAmount, BigDecimal grossAmount) {
    public boolean hasZeroAmounts() {
      return netAmount != null && netAmount.signum() == 0
          && vatAmount != null && vatAmount.signum() == 0
          && grossAmount != null && grossAmount.signum() == 0;
    }
  }
}
