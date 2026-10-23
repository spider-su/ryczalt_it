package com.smartbox.investory.ryczalt.application.ksef;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.application.port.RyczaltCorrectionWriter;
import com.smartbox.investory.ryczalt.integration.ksef.InvoiceSourceRecord;
import com.smartbox.investory.ryczalt.persistence.*;
import com.smartbox.investory.shared.currency.CurrencyType;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Applies a verified, zero-value sale-date correction to the original invoice identity. */
@Service
public class RyczaltKsefDateCorrectionService {
  private static final String TYPE = "INVOICE_CORRECTION";
  private static final ObjectMapper JSON = new ObjectMapper();
  private final RyczaltSourceReferenceJpaRepository sources;
  private final RyczaltInvoiceJpaRepository invoices;
  private final RyczaltPeriodJpaRepository periods;
  private final RyczaltCorrectionWriter corrections;
  private final RyczaltAuditEventWriter audit;

  public RyczaltKsefDateCorrectionService(RyczaltSourceReferenceJpaRepository sources,
      RyczaltInvoiceJpaRepository invoices, RyczaltPeriodJpaRepository periods,
      RyczaltCorrectionWriter corrections, RyczaltAuditEventWriter audit) {
    this.sources = sources;
    this.invoices = invoices;
    this.periods = periods;
    this.corrections = corrections;
    this.audit = audit;
  }

  public boolean alreadyApplied(long profileId, String externalId) {
    return sources.findByProfileIdAndEntityTypeAndSourceAndExternalId(
        profileId, TYPE, "KSEF", externalId).isPresent();
  }

  public boolean hasAppliedCorrection(long profileId, long invoiceId) {
    return !sources.findByProfileIdAndEntityTypeAndEntityIdIn(
        profileId, TYPE, List.of(invoiceId)).isEmpty();
  }

  // Called inside the importer's transaction; history, date and provenance commit together.
  public AppliedCorrection apply(long profileId, InvoiceSourceRecord record) {
    var correction = record.saleDateCorrection();
    if (record.reference() == null || record.reference().isBlank()
        || correction == null || correction.originalExternalId() == null
        || correction.originalReference() == null || correction.originalIssueDate() == null
        || correction.correctedSaleDate() == null
        || record.issueDate() == null || record.netAmount() == null
        || record.vatAmount() == null || record.grossAmount() == null
        || record.netAmount().signum() != 0 || record.vatAmount().signum() != 0
        || record.grossAmount().signum() != 0) {
      throw new IllegalArgumentException("A date correction requires explicit zero monetary changes");
    }
    var source = sources.findByProfileIdAndEntityTypeAndSourceAndExternalId(
        profileId, "INVOICE", "KSEF", correction.originalExternalId())
        .orElseThrow(() -> new IllegalArgumentException("Original invoice is not imported in this profile"));
    var invoice = invoices.findByIdAndProfileId(source.getEntityId(), profileId).orElseThrow();
    if (invoice.getDirection() != record.direction()
        || !invoice.getReference().equals(correction.originalReference())
        || !invoice.getIssueDate().equals(correction.originalIssueDate())
        || invoice.getCounterparty() == null
        || !java.util.Objects.equals(invoice.getCounterparty().getTaxIdentifier(), record.counterpartyTaxId())) {
      throw new IllegalArgumentException("Correction identity does not match the original invoice");
    }
    if (invoice.getCurrency() != CurrencyType.PLN || !"PLN".equals(record.currency())) {
      throw new IllegalArgumentException("Foreign-currency date corrections require an FX review");
    }
    // Do not let an older correction replace a newer one when querying historical months.
    for (var prior : sources.findByProfileIdAndEntityTypeAndEntityIdIn(profileId, TYPE, List.of(invoice.id()))) {
      try {
        String issued = JSON.readTree(prior.getMetadata()).path("issueDate").asText();
        if (!java.time.LocalDate.parse(issued).isBefore(record.issueDate())) {
          throw new IllegalArgumentException("A same-day or newer date correction is already applied; review required");
        }
      } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
        throw new IllegalStateException("Invalid stored correction metadata", exception);
      }
    }
    String reason = correction.reason() == null ? "KSeF sale-date correction" : correction.reason();
    if (reason.isBlank() || reason.length() > 1000) {
      throw new IllegalArgumentException("Correction reason must contain 1 to 1000 characters");
    }
    var oldPeriod = invoice.getPeriod();
    YearMonth from = YearMonth.of(oldPeriod.getYear(), oldPeriod.getMonth());
    YearMonth to = YearMonth.from(correction.correctedSaleDate());
    if (oldPeriod.getStatus().isFrozen()) {
      throw new FrozenPeriodMutationException(profileId, from.getYear(), from.getMonthValue());
    }
    var target = periods.findByProfileIdAndYearAndMonth(profileId, to.getYear(), to.getMonthValue())
        .orElseGet(() -> periods.save(new RyczaltPeriodEntity(profileId, to.getYear(), to.getMonthValue(),
            com.smartbox.investory.ryczalt.domain.PeriodStatus.OPEN)));
    if (target.getStatus().isFrozen()) {
      throw new FrozenPeriodMutationException(profileId, to.getYear(), to.getMonthValue());
    }
    var before = invoice.getAccountingDate();
    invoice.correctAccountingDate(correction.correctedSaleDate(), target);
    invoices.save(invoice);
    long historyId = corrections.write(profileId, oldPeriod.id(), "INVOICE", invoice.id(),
        reason, Instant.now(), target.id());
    try {
      String metadata = JSON.writeValueAsString(Map.of(
          "kind", "SALE_DATE_CORRECTION", "correctionId", historyId,
          "originalExternalId", correction.originalExternalId(),
          "previousAccountingDate", before.toString(),
          "correctedAccountingDate", correction.correctedSaleDate().toString(),
          "issueDate", record.issueDate().toString(), "reference", record.reference(), "reason", reason));
      sources.save(new RyczaltSourceReferenceEntity(profileId, TYPE, invoice.id(), "KSEF",
          record.sourceExternalId(), metadata));
    } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
      throw new IllegalStateException("Cannot encode correction provenance", exception);
    }
    audit.write(profileId, target.id(), "INVOICE_DATE_CORRECTED", reason, "KSEF_SYNC", Instant.now());
    return new AppliedCorrection(invoice.getDirection(), from, to);
  }

  public record AppliedCorrection(InvoiceDirection direction, YearMonth from, YearMonth to) {}
}
