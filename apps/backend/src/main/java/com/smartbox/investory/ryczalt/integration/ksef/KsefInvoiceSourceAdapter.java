package com.smartbox.investory.ryczalt.integration.ksef;

import com.smartbox.investory.integrations.ksef.Fa3Invoice;
import com.smartbox.investory.integrations.ksef.Fa3InvoiceParser;
import com.smartbox.investory.integrations.ksef.KsefInvoiceService;
import com.smartbox.investory.integrations.ksef.KsefSubject;
import com.smartbox.investory.ryczalt.persistence.InvoiceDirection;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import com.smartbox.investory.integrations.ksef.KsefInvoiceMetadata.InvoiceMetadata;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Adapts the shared KSeF transport to the native Ryczalt invoice source port: discovers document
 * numbers, downloads FA(3) XML, parses it, and maps it to provider-neutral records. No accounting
 * dependency and no accounting classification guessing.
 */
@Component
public class KsefInvoiceSourceAdapter implements InvoiceSourcePort {
  private final KsefInvoiceService invoices;
  private final Fa3InvoiceParser parser;

  public KsefInvoiceSourceAdapter(KsefInvoiceService invoices, Fa3InvoiceParser parser) {
    this.invoices = invoices;
    this.parser = parser;
  }

  @Override
  public List<InvoiceSourceRecord> fetch(KsefSyncCommand command) {
    List<InvoiceSourceRecord> records = new ArrayList<>();
    Set<String> seen = new LinkedHashSet<>();
    for (KsefSyncMode mode : command.modes()) {
      KsefSubject subject = mode == KsefSyncMode.SALES ? KsefSubject.SELLER : KsefSubject.BUYER;
      InvoiceDirection direction =
          mode == KsefSyncMode.SALES ? InvoiceDirection.INCOME : InvoiceDirection.COST;
      for (var metadata : invoices.listInvoiceMetadata(command.month(), subject)) {
        String ksefNumber = metadata.ksefNumber();
        if (!seen.add(ksefNumber)) continue;
        Fa3Invoice invoice =
            parser.parse(invoices.downloadInvoice(ksefNumber).getBytes(StandardCharsets.UTF_8));
        records.add(toRecord(metadata, direction, invoice));
      }
    }
    return records;
  }

  @Override
  public java.util.Optional<String> taxpayerNip() {
    return invoices.taxpayerNip();
  }

  private InvoiceSourceRecord toRecord(
      InvoiceMetadata metadata, InvoiceDirection direction, Fa3Invoice invoice) {
    String ksefNumber = metadata.ksefNumber();
    LocalDate issueDate = invoice.issueDate() != null ? invoice.issueDate() : invoice.saleDate();
    LocalDate accountingDate = invoice.saleDate() != null ? invoice.saleDate() : issueDate;
    if (issueDate == null || accountingDate == null) {
      throw new IllegalStateException("KSeF invoice " + ksefNumber + " has no usable date");
    }
    boolean sale = direction == InvoiceDirection.INCOME;
    String counterpartyName = sale ? invoice.buyerName() : invoice.sellerName();
    String counterpartyTaxId = sale ? invoice.buyerNip() : invoice.sellerNip();
    InvoiceSourceRecord.SaleDateCorrection correction = null;
    if ("KOR".equals(invoice.invoiceType()) && invoice.saleDate() != null
        && invoice.correctedInvoices().size() == 1 && !invoice.hasInvoiceLines()
        && metadata.hasZeroAmounts() && zeroOrAbsent(invoice.netAmount())
        && zeroOrAbsent(invoice.vatAmount()) && invoice.grossAmount() != null
        && invoice.grossAmount().signum() == 0) {
      var original = invoice.correctedInvoices().getFirst();
      if (original.ksefNumber() != null && original.reference() != null && original.issueDate() != null) {
        correction = new InvoiceSourceRecord.SaleDateCorrection(original.ksefNumber(),
            original.reference(), original.issueDate(), invoice.saleDate(), invoice.correctionReason());
      }
    }
    return new InvoiceSourceRecord(
        ksefNumber,
        direction,
        invoice.reference(),
        issueDate,
        accountingDate,
        correction == null ? invoice.netAmount() : metadata.netAmount(),
        correction == null ? invoice.vatAmount() : metadata.vatAmount(),
        invoice.grossAmount(),
        invoice.currency() == null ? "PLN" : invoice.currency(),
        counterpartyName,
        counterpartyTaxId,
        // KSeF does not carry a ryczalt rate or a deductible-VAT decision; leave them unresolved.
        null,
        null,
        "PL",
        correction);
  }
  private boolean zeroOrAbsent(BigDecimal amount) {
    return amount == null || amount.signum() == 0;
  }
}
