package com.smartbox.investory.ryczalt.application.ksef;

import com.smartbox.investory.ryczalt.persistence.InvoiceDirection;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/** Formats the "new invoices from KSeF" notification, split by approval outcome. */
public final class KsefImportNotification {
  private KsefImportNotification() {}

  public record ImportedInvoice(
      InvoiceDirection direction,
      String reference,
      String counterparty,
      BigDecimal grossAmount,
      String currency,
      boolean autoApproved) {}

  public static String format(List<ImportedInvoice> invoices) {
    List<ImportedInvoice> approved = invoices.stream().filter(ImportedInvoice::autoApproved).toList();
    List<ImportedInvoice> review = invoices.stream().filter(i -> !i.autoApproved()).toList();
    StringBuilder text = new StringBuilder("📥 KSeF: ")
        .append(invoices.size()).append(invoices.size() == 1 ? " new invoice" : " new invoices");
    if (!approved.isEmpty()) {
      text.append("\n\n✅ Auto-approved (").append(approved.size()).append("):");
      approved.forEach(invoice -> text.append('\n').append(line(invoice)));
    }
    if (!review.isEmpty()) {
      text.append("\n\n⚠️ Needs your approval (").append(review.size()).append("):");
      review.forEach(invoice -> text.append('\n').append(line(invoice)));
      text.append("\n\nOpen the app to review them.");
    }
    return text.toString();
  }

  private static String line(ImportedInvoice invoice) {
    String amount = invoice.grossAmount() == null
        ? "?"
        : invoice.grossAmount().setScale(2, RoundingMode.HALF_UP).toPlainString();
    return "• " + (invoice.direction() == InvoiceDirection.INCOME ? "income" : "cost")
        + " · " + invoice.reference()
        + (invoice.counterparty() == null ? "" : " · " + invoice.counterparty())
        + " · " + amount + " " + invoice.currency();
  }
}
