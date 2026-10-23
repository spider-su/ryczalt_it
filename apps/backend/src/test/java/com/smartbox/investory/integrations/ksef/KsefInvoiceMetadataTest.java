package com.smartbox.investory.integrations.ksef;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class KsefInvoiceMetadataTest {
  @Test
  void extractsDocumentNumbers() {
    assertThat(
            KsefInvoiceMetadata.extractInvoices(
                """
                {"invoices":[{"ksefNumber":" A "},{"ksefNumber":"B"}]}
                """))
        .extracting(KsefInvoiceMetadata.InvoiceMetadata::ksefNumber)
        .containsExactly("A", "B");
  }

  @Test
  void emptyInvoiceArrayMeansNoInvoices() {
    assertThat(KsefInvoiceMetadata.extractInvoices("{\"invoices\":[]}")).isEmpty();
  }

  @Test
  void missingOrIncompleteMetadataFailsClosed() {
    assertThatThrownBy(() -> KsefInvoiceMetadata.extractInvoices("{}"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("invoices array");
    assertThatThrownBy(
            () -> KsefInvoiceMetadata.extractInvoices("{\"invoices\":[{}]}"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("document number");
    assertThatThrownBy(() -> KsefInvoiceMetadata.extractInvoices(" "))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("empty");
  }
  @Test
  void preservesExplicitZeroMetadataWithoutDefaultingMissingAmounts() {
    var records = KsefInvoiceMetadata.extractInvoices("""
        {"invoices":[{"ksefNumber":"CORRECTION","netAmount":0,"vatAmount":0,"grossAmount":0},
        {"ksefNumber":"UNKNOWN"}]}
        """);
    assertThat(records.getFirst().hasZeroAmounts()).isTrue();
    assertThat(records.getLast().hasZeroAmounts()).isFalse();
    assertThatThrownBy(() -> KsefInvoiceMetadata.extractInvoices(
        "{\"invoices\":[{\"ksefNumber\":\"BAD\",\"netAmount\":\"invalid\"}]}"))
        .isInstanceOf(IllegalStateException.class);
  }
}
