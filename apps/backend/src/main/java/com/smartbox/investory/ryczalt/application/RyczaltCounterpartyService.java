package com.smartbox.investory.ryczalt.application;

import com.smartbox.investory.ryczalt.application.port.RyczaltAuditEventWriter;
import com.smartbox.investory.ryczalt.domain.*;
import com.smartbox.investory.ryczalt.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RyczaltCounterpartyService {
  private final RyczaltCounterpartyJpaRepository counterparties;
  private final RyczaltCounterpartyRuleJpaRepository rules;
  private final RyczaltInvoiceJpaRepository invoices;
  private final RyczaltSourceReferenceJpaRepository sourceReferences;
  private final RyczaltAuditEventWriter audit;
  private final CounterpartyRuleMatcher matcher = new CounterpartyRuleMatcher();

  public RyczaltCounterpartyService(
      RyczaltCounterpartyJpaRepository counterparties,
      RyczaltCounterpartyRuleJpaRepository rules,
      RyczaltInvoiceJpaRepository invoices,
      RyczaltSourceReferenceJpaRepository sourceReferences,
      RyczaltAuditEventWriter audit) {
    this.counterparties = counterparties;
    this.rules = rules;
    this.invoices = invoices;
    this.sourceReferences = sourceReferences;
    this.audit = audit;
  }

  @Transactional(readOnly = true)
  public List<Counterparty> list(long profileId) {
    return counterparties.findSummaries(profileId);
  }

  @Transactional(readOnly = true)
  public Counterparty get(long profileId, long id) {
    var row = entity(profileId, id);
    return new Counterparty(
        id,
        profileId,
        row.getTaxIdentifier(),
        row.getCountry(),
        row.getLegalName(),
        row.getAlias(),
        row.getBankAccount(),
        rules.countByProfileIdAndCounterpartyId(profileId, id),
        invoices.countByProfileIdAndCounterparty_Id(profileId, id));
  }

  @Transactional
  public Counterparty setAlias(long profileId, long id, String alias) {
    var row = entity(profileId, id);
    row.setAlias(alias);
    return counterparty(counterparties.save(row));
  }

  @Transactional(readOnly = true)
  public List<CounterpartyRule> rules(long profileId, long counterpartyId) {
    entity(profileId, counterpartyId);
    return this.rules
        .findByProfileIdAndCounterpartyIdOrderByName(profileId, counterpartyId)
        .stream()
        .map(this::rule)
        .toList();
  }

  @Transactional
  public CounterpartyRule addRule(long profileId, long counterpartyId, RuleCommand c) {
    var cp = entity(profileId, counterpartyId);
    var saved = rule(rules.save(c.entity(profileId, cp)));
    refreshPaymentPolicies(profileId, counterpartyId);
    return saved;
  }

  @Transactional
  public CounterpartyRule updateRule(
      long profileId, long counterpartyId, long ruleId, RuleCommand c) {
    entity(profileId, counterpartyId);
    var row =
        rules
            .findByIdAndProfileIdAndCounterpartyId(ruleId, profileId, counterpartyId)
            .orElseThrow(() -> new RyczaltCounterpartyRuleNotFoundException(profileId, ruleId));
    row.update(
        c.name(),
        c.sourceType(),
        c.documentType(),
        c.serviceKey(),
        c.classification(),
        c.vatTreatment(),
        c.vatDeductionRatio(),
        c.ryczaltRate(),
        c.autoApprove(),
        c.paymentVerificationPolicy());
    var saved = rule(rules.save(row));
    refreshPaymentPolicies(profileId, counterpartyId);
    return saved;
  }

  /**
   * Apply unambiguous payment waivers to existing KSeF invoices whose accounting decision does not
   * conflict with the rule. Missing VAT metadata stays untouched. Never replace bank evidence or
   * historical manual confirmations.
   */
  @Transactional
  public int refreshPaymentPolicies(long profileId, long counterpartyId) {
    var cp = entity(profileId, counterpartyId);
    if (cp.getTaxIdentifier() == null || cp.getTaxIdentifier().isBlank()) return 0;
    var candidates =
        invoices.findByProfileIdAndCounterparty_IdOrderByAccountingDateAscIdAsc(
            profileId, counterpartyId);
    if (candidates.isEmpty()) return 0;
    var ksefIds =
        sourceReferences.findByProfileIdAndEntityTypeAndEntityIdIn(
                profileId, "INVOICE", candidates.stream().map(RyczaltInvoiceEntity::id).toList())
            .stream()
            .filter(ref -> "KSEF".equals(ref.getSource()))
            .map(RyczaltSourceReferenceEntity::getEntityId)
            .collect(Collectors.toSet());
    var match = matcher.match(
        new InvoiceCandidate(counterpartyId, "KSEF", null, null), rules(profileId, counterpartyId));
    if (match.kind() != RuleMatchResult.Kind.MATCHED) return 0;
    var rule = match.rule();
    if (!rule.autoApprove()
        || rule.paymentVerificationPolicy() != PaymentVerificationPolicy.NOT_REQUIRED)
      return 0;
    int changed = 0;
    for (var invoice : candidates) {
      if (!ksefIds.contains(invoice.id())
          || invoice.getPeriod().getStatus().isFrozen()
          || invoice.getApprovalStatus() != ApprovalStatus.APPROVED
          || invoice.getPaymentVerificationPolicy() == PaymentVerificationPolicy.NOT_REQUIRED
          || "MATCHED".equals(invoice.getPaymentStatus())
          || "PARTIALLY_MATCHED".equals(invoice.getPaymentStatus())
          || !Objects.equals(invoice.getClassification(), rule.classification())
          || (invoice.getVatTreatment() != null
              && !Objects.equals(invoice.getVatTreatment(), rule.vatTreatment()))
          || (invoice.getVatDeductionRatio() != null
              && !sameAmount(invoice.getVatDeductionRatio(), rule.vatDeductionRatio()))
          || !sameAmount(invoice.getRyczaltRate(), rule.ryczaltRate())) continue;
      invoice.waivePaymentVerification();
      invoices.save(invoice);
      audit.write(
          profileId, invoice.getPeriod().id(), "INVOICE_PAYMENT_POLICY_CHANGED",
          "invoiceId=" + invoice.id() + "; ruleId=" + rule.id()
              + "; paymentVerificationPolicy=NOT_REQUIRED",
          "system:counterparty-rule", Instant.now());
      changed++;
    }
    return changed;
  }

  private static boolean sameAmount(BigDecimal left, BigDecimal right) {
    return left == null ? right == null : right != null && left.compareTo(right) == 0;
  }

  @Transactional
  public void deleteRule(long profileId, long counterpartyId, long ruleId) {
    rules.delete(
        rules
            .findByIdAndProfileIdAndCounterpartyId(ruleId, profileId, counterpartyId)
            .orElseThrow(() -> new RyczaltCounterpartyRuleNotFoundException(profileId, ruleId)));
  }

  @Transactional(readOnly = true)
  public RuleMatchResult match(InvoiceCandidate candidate, long profileId) {
    return matcher.match(candidate, rules(profileId, candidate.counterpartyId()));
  }

  /** Resolve only a strong identity. Names and aliases never merge counterparties. */
  @Transactional
  public RyczaltCounterpartyEntity resolveByTaxId(
      long profileId, String taxIdentifier, String country, String legalName) {
    if (taxIdentifier == null || taxIdentifier.isBlank()) return null;
    String normalizedTax = taxIdentifier.trim();
    String normalizedCountry =
        country == null || country.isBlank() ? "PL" : country.trim().toUpperCase();
    return counterparties
        .findByProfileIdAndTaxIdentifierAndCountry(profileId, normalizedTax, normalizedCountry)
        .orElseGet(
            () ->
                counterparties.save(
                    new RyczaltCounterpartyEntity(
                        profileId,
                        normalizedTax,
                        normalizedCountry,
                        legalName == null || legalName.isBlank()
                            ? normalizedTax
                            : legalName.trim())));
  }

  private RyczaltCounterpartyEntity entity(long p, long id) {
    return counterparties
        .findByIdAndProfileId(id, p)
        .orElseThrow(() -> new RyczaltCounterpartyNotFoundException(p, id));
  }

  private Counterparty counterparty(RyczaltCounterpartyEntity e) {
    return new Counterparty(
        e.id(),
        e.getProfileId(),
        e.getTaxIdentifier(),
        e.getCountry(),
        e.getLegalName(),
        e.getAlias(),
        e.getBankAccount(),
        0,
        0);
  }

  private CounterpartyRule rule(RyczaltCounterpartyRuleEntity e) {
    return new CounterpartyRule(
        e.id(),
        e.getProfileId(),
        e.getCounterparty().id(),
        e.getName(),
        e.getSourceType(),
        e.getDocumentType(),
        e.getServiceKey(),
        e.getClassification(),
        e.getVatTreatment(),
        e.getVatDeductionRatio(),
        e.getRyczaltRate(),
        e.isAutoApprove(),
        e.getPaymentVerificationPolicy());
  }

  public record RuleCommand(
      String name,
      String sourceType,
      String documentType,
      String serviceKey,
      String classification,
      String vatTreatment,
      BigDecimal vatDeductionRatio,
      BigDecimal ryczaltRate,
      boolean autoApprove,
      PaymentVerificationPolicy paymentVerificationPolicy) {
    RyczaltCounterpartyRuleEntity entity(long p, RyczaltCounterpartyEntity cp) {
      return new RyczaltCounterpartyRuleEntity(
          p,
          cp,
          name,
          sourceType,
          documentType,
          serviceKey,
          classification,
          vatTreatment,
          vatDeductionRatio,
          ryczaltRate,
          autoApprove,
          paymentVerificationPolicy == null
              ? PaymentVerificationPolicy.REQUIRED
              : paymentVerificationPolicy);
    }
  }
}
