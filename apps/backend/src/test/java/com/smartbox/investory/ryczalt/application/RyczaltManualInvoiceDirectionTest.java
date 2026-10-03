package com.smartbox.investory.ryczalt.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceCandidateEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceCandidateJpaRepository;
import com.smartbox.investory.ryczalt.persistence.InvoiceDirection;
import com.smartbox.investory.ryczalt.persistence.RyczaltSourceReferenceJpaRepository;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class RyczaltManualInvoiceDirectionTest {
  @Test
  void preservesIncomeDirectionForManualSalesInvoice() {
    var candidates = mock(RyczaltInvoiceCandidateJpaRepository.class);
    var sources = mock(RyczaltSourceReferenceJpaRepository.class);
    var counterparties = mock(RyczaltCounterpartyService.class);
    var persistence = mock(RyczaltInvoiceCandidatePersistenceService.class);
    var approval = mock(RyczaltInvoiceApprovalService.class);
    var service =
        new RyczaltInvoiceRecognitionService(
            null, candidates, sources, counterparties, persistence, approval);
    when(sources.findByProfileIdAndEntityTypeAndSourceAndExternalId(
            eq(42L), eq("INVOICE"), eq("MANUAL"), any()))
        .thenReturn(Optional.empty());
    when(candidates.findByProfileIdAndSourceTypeAndSourceExternalId(eq(42L), eq("MANUAL"), any()))
        .thenReturn(Optional.empty());
    when(persistence.persist(any(RyczaltInvoiceCandidateEntity.class), eq(null)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    var candidate =
        service.createManual(
            42L,
            new RyczaltInvoiceRecognitionService.ManualCandidateCommand(
                InvoiceDirection.INCOME,
                "FV-2026-1",
                java.time.LocalDate.of(2026, 1, 5),
                java.time.LocalDate.of(2026, 1, 5),
                null,
                "EUR",
                new BigDecimal("100.00"),
                new BigDecimal("23.00"),
                new BigDecimal("123.00"),
                new RyczaltInvoiceRecognitionService.ManualCounterparty(
                    "Customer", null, "PL")));

    assertEquals("INCOME", candidate.direction());
  }
}
