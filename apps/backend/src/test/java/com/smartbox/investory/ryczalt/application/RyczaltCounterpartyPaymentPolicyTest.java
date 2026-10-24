package com.smartbox.investory.ryczalt.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.domain.*;
import com.smartbox.investory.ryczalt.persistence.*;
import com.smartbox.investory.shared.currency.CurrencyType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class RyczaltCounterpartyPaymentPolicyTest {
  private final RyczaltCounterpartyJpaRepository counterparties = mock();
  private final RyczaltCounterpartyRuleJpaRepository rules = mock();
  private final RyczaltInvoiceJpaRepository invoices = mock();
  private final RyczaltSourceReferenceJpaRepository sources = mock();
  private final RyczaltAuditEventWriter audit = mock();
  private final RyczaltCounterpartyService service =
      new RyczaltCounterpartyService(counterparties, rules, invoices, sources, audit);

  @Test
  void waiverPreservesManualEvidenceAndAccountingAndIsIdempotent() {
    var invoice = setup(PeriodStatus.OPEN, "VEHICLE", true);
    invoice.markManuallyPaid(LocalDate.of(2026, 2, 20), "confirmed");
    assertThat(service.refreshPaymentPolicies(7L, 3L)).isEqualTo(1);
    assertThat(invoice.getPaymentVerificationPolicy()).isEqualTo(PaymentVerificationPolicy.NOT_REQUIRED);
    assertThat(invoice.getPaymentStatus()).isEqualTo("MANUALLY_CONFIRMED");
    assertThat(invoice.getManualPaidDate()).isEqualTo(LocalDate.of(2026, 2, 20));
    assertThat(invoice.getManualPaidNote()).isEqualTo("confirmed");
    assertThat(invoice.getApprovalMethod()).isEqualTo(ApprovalMethod.MANUAL);
    assertThat(invoice.getClassification()).isEqualTo("VEHICLE");
    assertThat(invoice.getNetAmount()).isEqualByComparingTo("100");
    assertThat(invoice.getDeductibleVat()).isEqualByComparingTo("11.5");
    assertThat(service.refreshPaymentPolicies(7L, 3L)).isZero();
    verify(invoices, times(1)).save(invoice);
    verify(audit, times(1)).write(eq(7L), any(), eq("INVOICE_PAYMENT_POLICY_CHANGED"),
        contains("ruleId="), eq("system:counterparty-rule"), any());
    verify(invoices, times(2)).findByProfileIdAndCounterparty_IdOrderByAccountingDateAscIdAsc(7L, 3L);
  }

  @Test
  void frozenInvoicesAreNotRewritten() {
    var invoice = setup(PeriodStatus.FROZEN, "VEHICLE", true);
    assertThat(service.refreshPaymentPolicies(7L, 3L)).isZero();
    verify(invoices, never()).save(invoice);
    verifyNoInteractions(audit);
  }

  @Test
  void mismatchedAccountingDecisionIsNotReinterpreted() {
    setup(PeriodStatus.OPEN, "OFFICE_SERVICE", true);
    assertThat(service.refreshPaymentPolicies(7L, 3L)).isZero();
    verifyNoInteractions(audit);
  }

  @Test
  void provenanceIsRequired() {
    setup(PeriodStatus.OPEN, "VEHICLE", false);
    assertThat(service.refreshPaymentPolicies(7L, 3L)).isZero();
    verifyNoInteractions(audit);
  }

  @Test
  void ambiguousRulesDoNotWaivePaymentChecks() {
    setup(PeriodStatus.OPEN, "VEHICLE", true);
    var existing = rules.findByProfileIdAndCounterpartyIdOrderByName(7L, 3L).getFirst();
    when(rules.findByProfileIdAndCounterpartyIdOrderByName(7L, 3L)).thenReturn(List.of(existing, existing));
    assertThat(service.refreshPaymentPolicies(7L, 3L)).isZero();
    verifyNoInteractions(audit);
  }

  @Test
  void bankEvidenceIsNotOverridden() {
    var real = setup(PeriodStatus.OPEN, "VEHICLE", true);
    var invoice = spy(real);
    when(invoice.getPaymentStatus()).thenReturn("MATCHED");
    when(invoices.findByProfileIdAndCounterparty_IdOrderByAccountingDateAscIdAsc(7L, 3L))
        .thenReturn(List.of(invoice));
    assertThat(service.refreshPaymentPolicies(7L, 3L)).isZero();
    verify(invoice, never()).waivePaymentVerification();
    verifyNoInteractions(audit);
  }

  private RyczaltInvoiceEntity setup(PeriodStatus status, String classification, boolean ksef) {
    var cp = mock(RyczaltCounterpartyEntity.class);
    when(cp.id()).thenReturn(3L);
    when(cp.getTaxIdentifier()).thenReturn("TEST-TAX-ID");
    when(counterparties.findByIdAndProfileId(3L, 7L)).thenReturn(Optional.of(cp));
    var rule = new RyczaltCounterpartyRuleEntity(7L, cp, "Test rule", "KSEF", null, null,
        "VEHICLE", "DOMESTIC_PURCHASE", new BigDecimal("0.5"), null, true,
        PaymentVerificationPolicy.NOT_REQUIRED);
    org.springframework.test.util.ReflectionTestUtils.setField(rule, "id", 5L);
    when(rules.findByProfileIdAndCounterpartyIdOrderByName(7L, 3L)).thenReturn(List.of(rule));
    var period = new RyczaltPeriodEntity(7L, 2026, 2, status);
    var invoice = new RyczaltInvoiceEntity(period, 7L, InvoiceDirection.COST, "SYNTHETIC-1",
        LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 1), new BigDecimal("100"),
        new BigDecimal("23"), new BigDecimal("123"), CurrencyType.PLN, new BigDecimal("100"),
        null, new BigDecimal("11.5"));
    invoice.applyDecision(cp, classification, "DOMESTIC_PURCHASE", new BigDecimal("0.500000"),
        null, PaymentVerificationPolicy.REQUIRED, ApprovalStatus.APPROVED, ApprovalMethod.MANUAL);
    // Entity IDs are assigned by persistence; the mocked reference deliberately mirrors this fixture ID.
    var ref = mock(RyczaltSourceReferenceEntity.class);
    when(ref.getSource()).thenReturn("KSEF");
    when(invoices.findByProfileIdAndCounterparty_IdOrderByAccountingDateAscIdAsc(7L, 3L))
        .thenReturn(List.of(invoice));
    org.springframework.test.util.ReflectionTestUtils.setField(invoice, "id", 42L);
    when(ref.getEntityId()).thenReturn(42L);
    when(sources.findByProfileIdAndEntityTypeAndEntityIdIn(eq(7L), eq("INVOICE"), any()))
        .thenReturn(ksef ? List.of(ref) : List.of());
    return invoice;
  }
}
