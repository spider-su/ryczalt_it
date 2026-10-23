package com.smartbox.investory.integrations.ksef;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.smartbox.investory.ryczalt.integration.ksef.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class KsefInvoiceSourceAdapterTest {
  private final KsefInvoiceService service = mock(KsefInvoiceService.class);
  private final String xml = """
      <Faktura xmlns="urn:synthetic"><Podmiot1><NIP>1111111111</NIP></Podmiot1>
      <Podmiot2><NIP>2222222222</NIP></Podmiot2><Fa><KodWaluty>PLN</KodWaluty>
      <P_1>2026-02-20</P_1><P_2>COR/EXAMPLE</P_2><P_6>2026-01-31</P_6>
      <P_15>0.00</P_15><RodzajFaktury>KOR</RodzajFaktury>
      <DaneFaKorygowanej><DataWystFaKorygowanej>2026-02-10</DataWystFaKorygowanej>
      <NrFaKorygowanej>ORIGINAL/EXAMPLE</NrFaKorygowanej><NrKSeF>1</NrKSeF>
      <NrKSeFFaKorygowanej>ORIGINAL-KSEF</NrKSeFFaKorygowanej></DaneFaKorygowanej>
      </Fa></Faktura>
      """;

  private InvoiceSourceRecord fetch(String document, KsefInvoiceMetadata.InvoiceMetadata metadata) {
    var month = YearMonth.of(2026, 2);
    when(service.listInvoiceMetadata(month, KsefSubject.SELLER)).thenReturn(List.of(metadata));
    when(service.downloadInvoice("CORRECTION-KSEF")).thenReturn(document);
    return new KsefInvoiceSourceAdapter(service, new Fa3InvoiceParser()).fetch(
        new InvoiceSourcePort.KsefSyncCommand(month, Set.of(KsefSyncMode.SALES))).getFirst();
  }

  private KsefInvoiceMetadata.InvoiceMetadata zeros() {
    return new KsefInvoiceMetadata.InvoiceMetadata("CORRECTION-KSEF", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
  }

  @Test
  void linksDateOnlyCorrectionUsingExplicitMetadataZerosAndXmlDate() {
    var result = fetch(xml, zeros());
    assertThat(result.netAmount()).isEqualByComparingTo("0");
    assertThat(result.vatAmount()).isEqualByComparingTo("0");
    assertThat(result.saleDateCorrection().originalExternalId()).isEqualTo("ORIGINAL-KSEF");
    assertThat(result.saleDateCorrection().correctedSaleDate()).isEqualTo(LocalDate.of(2026, 1, 31));
    assertThat(result.saleDateCorrection().originalIssueDate()).isEqualTo(LocalDate.of(2026, 2, 10));
  }

  @Test
  void missingMetadataIsNotConvertedIntoZero() {
    var result = fetch(xml, new KsefInvoiceMetadata.InvoiceMetadata("CORRECTION-KSEF", null, null, null));
    assertThat(result.saleDateCorrection()).isNull();
    assertThat(result.netAmount()).isNull();
    assertThat(result.vatAmount()).isNull();
  }

  @Test
  void monetaryLinesOrMissingOriginalLinkRequireReview() {
    assertThat(fetch(xml.replace("</Fa>", "<FaWiersz><P_11>10</P_11></FaWiersz></Fa>"), zeros())
        .saleDateCorrection()).isNull();
    assertThat(fetch(xml.replace("<NrKSeFFaKorygowanej>ORIGINAL-KSEF</NrKSeFFaKorygowanej>", ""), zeros())
        .saleDateCorrection()).isNull();
    assertThat(fetch(xml.replace("<P_6>2026-01-31</P_6>", ""), zeros()).saleDateCorrection()).isNull();
  }
}
