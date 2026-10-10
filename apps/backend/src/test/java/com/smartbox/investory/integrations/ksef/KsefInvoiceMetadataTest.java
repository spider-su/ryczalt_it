package com.smartbox.investory.integrations.ksef;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

class KsefInvoiceMetadataTest {
  @Test
  void extractsDocumentNumbers() {
    assertThat(
            KsefInvoiceMetadata.extractKsefNumbers(
                """
                {"invoices":[{"ksefNumber":" A "},{"ksefNumber":"B"}]}
                """))
        .isEqualTo(List.of("A", "B"));
  }

  @Test
  void emptyInvoiceArrayMeansNoInvoices() {
    assertThat(KsefInvoiceMetadata.extractKsefNumbers("{\"invoices\":[]}")).isEmpty();
  }

  @Test
  void missingOrIncompleteMetadataFailsClosed() {
    assertThatThrownBy(() -> KsefInvoiceMetadata.extractKsefNumbers("{}"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("invoices array");
    assertThatThrownBy(
            () -> KsefInvoiceMetadata.extractKsefNumbers("{\"invoices\":[{}]}"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("document number");
    assertThatThrownBy(() -> KsefInvoiceMetadata.extractKsefNumbers(" "))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("empty");
  }
}
