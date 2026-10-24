package com.smartbox.investory.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.smartbox.investory.ryczalt.application.RyczaltAutoRecalculationService;
import com.smartbox.investory.ryczalt.application.ksef.KsefProfileMismatchException;
import com.smartbox.investory.ryczalt.application.ksef.RyczaltKsefImportService;
import com.smartbox.investory.ryczalt.application.ksef.RyczaltKsefSyncResult;
import com.smartbox.investory.ryczalt.application.query.RyczaltInvoiceQueryService;
import com.smartbox.investory.ryczalt.domain.ApprovalMethod;
import com.smartbox.investory.ryczalt.domain.ApprovalStatus;
import com.smartbox.investory.ryczalt.domain.PeriodStatus;
import com.smartbox.investory.ryczalt.integration.fx.RyczaltFxRateService;
import com.smartbox.investory.ryczalt.integration.ksef.InvoiceSourcePort;
import com.smartbox.investory.ryczalt.integration.ksef.InvoiceSourceRecord;
import com.smartbox.investory.ryczalt.integration.ksef.KsefSyncMode;
import com.smartbox.investory.ryczalt.persistence.FrozenPeriodMutationException;
import com.smartbox.investory.ryczalt.persistence.InvoiceDirection;
import com.smartbox.investory.ryczalt.persistence.RyczaltCounterpartyEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltCounterpartyJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltInvoiceJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltObligationJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodEntity;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodLifecycleService;
import com.smartbox.investory.ryczalt.persistence.RyczaltSourceReferenceJpaRepository;
import com.smartbox.investory.testsupport.WorkerDatabase;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import javax.sql.DataSource;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Native KSeF acquisition writes canonical invoices with provenance and no legacy accounting rows.
 */
@SpringBootTest(classes = RyczaltNativeKsefImportIT.TestConfiguration.class)
class RyczaltNativeKsefImportIT {
  private static final WorkerDatabase DATABASE = MigrationTestDatabase.open("ryczalt_ksef");
  private static final String PROFILE_ONE_NIP = "1234563218";
  private static final String PROFILE_TWO_NIP = "5260250274";

  @Autowired private RyczaltKsefImportService ksefImport;
  @Autowired private com.smartbox.investory.ryczalt.application.RyczaltCounterpartyService counterpartyService;
  @Autowired private ProgrammableInvoiceSource source;
  @Autowired private RecordingNotifier notifier;
  @Autowired private RyczaltPeriodJpaRepository periods;
  @Autowired private RyczaltInvoiceJpaRepository invoices;
  @Autowired private RyczaltCounterpartyJpaRepository counterparties;
  @Autowired private RyczaltInvoiceQueryService invoiceQueries;
  @Autowired private RyczaltSourceReferenceJpaRepository sourceReferences;
  @Autowired private JdbcTemplate jdbc;
  @Autowired private DataSource dataSource;
  @Autowired private EntityManagerFactory entityManagerFactory;

  @BeforeAll
  static void migrateSchema() {
    MigrationTestDatabase.migrate(DATABASE);
  }

  @AfterAll
  static void closeDatabase() {
    DATABASE.close();
  }

  @BeforeEach
  void clean() throws Exception {
    source.records.clear();
    source.nip = PROFILE_ONE_NIP;
    notifier.messages.clear();
    try (var connection = dataSource.getConnection();
        var statement = connection.createStatement()) {
      statement.execute(
          "TRUNCATE ryczalt.ryczalt_payment_match, ryczalt.ryczalt_source_reference,"
              + " ryczalt.ryczalt_obligation, ryczalt.ryczalt_transaction,"
              + " ryczalt.ryczalt_invoice, ryczalt.ryczalt_calculation,"
              + " ryczalt.ryczalt_audit_event, ryczalt.ryczalt_period,"
              + " ryczalt.ryczalt_counterparty_rule, ryczalt.ryczalt_counterparty RESTART IDENTITY"
              + " CASCADE");
    }
    seedProfile(1, "ksef-profile-one", PROFILE_ONE_NIP);
    seedProfile(2, "ksef-profile-two", PROFILE_TWO_NIP);
  }

  private void seedProfile(long id, String username, String nip) {
    jdbc.update(
        "INSERT INTO ryczalt.app_users(id, username, display_name) VALUES (?, ?, ?)"
            + " ON CONFLICT (id) DO NOTHING",
        id,
        username,
        username);
    jdbc.update(
        "INSERT INTO ryczalt.portfolios(id, name, user_id) VALUES (?, ?, ?)"
            + " ON CONFLICT (id) DO NOTHING",
        id,
        username,
        id);
    jdbc.update(
        "INSERT INTO ryczalt.ryczalt_profile(profile_id, nip) VALUES (?, ?)"
            + " ON CONFLICT (profile_id) DO UPDATE SET nip = EXCLUDED.nip",
        id,
        nip);
  }

  private InvoiceSourceRecord income(String ksefNumber, String amount) {
    BigDecimal net = new BigDecimal(amount);
    return new InvoiceSourceRecord(
        ksefNumber,
        InvoiceDirection.INCOME,
        "FV/" + ksefNumber,
        LocalDate.of(2026, 2, 10),
        LocalDate.of(2026, 2, 10),
        net,
        BigDecimal.ZERO,
        net,
        "PLN",
        "Buyer",
        "2222222222",
        null,
        null);
  }

  private InvoiceSourceRecord cost(String ksefNumber, String amount) {
    BigDecimal net = new BigDecimal(amount);
    return new InvoiceSourceRecord(
        ksefNumber,
        InvoiceDirection.COST,
        "FZ/" + ksefNumber,
        LocalDate.of(2026, 2, 12),
        LocalDate.of(2026, 2, 12),
        net,
        BigDecimal.ZERO,
        net,
        "PLN",
        "Seller",
        "1111111111",
        null,
        null);
  }

  @Test
  void syncCreatesCanonicalInvoiceWithKsefProvenanceAndNoLegacyWrite() {
    source.records.add(income("KSEF-1", "29600"));

    RyczaltKsefSyncResult result =
        ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));

    assertThat(result.imported()).isEqualTo(1);
    assertThat(invoices.count()).isEqualTo(1);
    var reference = sourceReferences.findAll().getFirst();
    assertThat(reference.getSource()).isEqualTo("KSEF");
    assertThat(reference.getEntityType()).isEqualTo("INVOICE");
    assertThat(reference.getExternalId()).isEqualTo("KSEF-1");
    assertThat(invoices.findAll().getFirst().getApprovalStatus())
        .isEqualTo(ApprovalStatus.NEEDS_REVIEW);
    assertThat(invoices.findAll().getFirst().getApprovalMethod())
        .isEqualTo(ApprovalMethod.KSEF_TRUSTED);
  }

  @Test
  void addingPaymentWaiverRuleRefreshesExistingInvoiceWithoutErasingManualEvidence() {
    source.records.add(cost("KSEF-WAIVER", "100"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.PURCHASES));
    var invoice = invoices.findAll().getFirst();
    long id = invoice.id();
    var cp = counterparties.findByProfileIdAndTaxIdentifierAndCountry(1, "1111111111", "PL").orElseThrow();
    invoice.applyDecision(cp, "VEHICLE", null, null, null,
        com.smartbox.investory.ryczalt.domain.PaymentVerificationPolicy.REQUIRED,
        ApprovalStatus.APPROVED, ApprovalMethod.MANUAL);
    invoice.markManuallyPaid(LocalDate.of(2026, 2, 20), "Synthetic confirmation");
    invoices.saveAndFlush(invoice);
    counterpartyService.addRule(1, cp.id(),
        new com.smartbox.investory.ryczalt.application.RyczaltCounterpartyService.RuleCommand(
            "Synthetic waiver", "KSEF", null, null, "VEHICLE", "DOMESTIC_PURCHASE",
            new BigDecimal("0.5"), null, true,
            com.smartbox.investory.ryczalt.domain.PaymentVerificationPolicy.NOT_REQUIRED));
    var refreshed = invoices.findByIdAndProfileId(id, 1).orElseThrow();
    assertThat(refreshed.getPaymentVerificationPolicy().name()).isEqualTo("NOT_REQUIRED");
    assertThat(refreshed.getPaymentStatus()).isEqualTo("MANUALLY_CONFIRMED");
    assertThat(refreshed.getManualPaidDate()).isEqualTo(LocalDate.of(2026, 2, 20));
    assertThat(refreshed.getApprovalMethod()).isEqualTo(ApprovalMethod.MANUAL);
    assertThat(refreshed.getVatTreatment()).isNull();
    assertThat(refreshed.getVatDeductionRatio()).isNull();
    assertThat(refreshed.getNetAmount()).isEqualByComparingTo("100");
    assertThat(counterpartyService.refreshPaymentPolicies(1, cp.id())).isZero();
    assertThat(jdbc.queryForObject("select count(*) from ryczalt.ryczalt_audit_event where event_type='INVOICE_PAYMENT_POLICY_CHANGED'", Integer.class)).isEqualTo(1);
    assertThat(jdbc.queryForObject("select count(*) from ryczalt.ryczalt_payment_match", Integer.class)).isZero();
  }

  @Test
  void repeatSyncIsIdempotent() {
    source.records.add(income("KSEF-1", "29600"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));
    RyczaltKsefSyncResult second =
        ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));

    assertThat(second.imported()).isZero();
    assertThat(second.duplicates()).isEqualTo(1);
    assertThat(invoices.count()).isEqualTo(1);
    assertThat(sourceReferences.count()).isEqualTo(1);
  }

  @Test
  void mapsSellerAndPurchaseDirections() {
    source.records.add(income("KSEF-SALE", "1000"));
    source.records.add(cost("KSEF-BUY", "500"));

    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES, KsefSyncMode.PURCHASES));

    assertThat(invoices.findAll())
        .extracting(RyczaltInvoiceEntity::getDirection)
        .containsExactlyInAnyOrder(InvoiceDirection.INCOME, InvoiceDirection.COST);
  }

  @Test
  void doesNotGuessUnresolvedAccountingClassifications() {
    source.records.add(cost("KSEF-BUY", "500"));

    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.PURCHASES));

    RyczaltInvoiceEntity invoice = invoices.findAll().getFirst();
    assertThat(invoice.getRyczaltRate()).isNull();
    assertThat(invoice.getDeductibleVat()).isNull();
  }

  @Test
  void reimportUpdatesExistingInvoice() {
    source.records.add(income("KSEF-1", "29600"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));

    source.records.clear();
    source.records.add(income("KSEF-1", "31000"));
    RyczaltKsefSyncResult result = ksefImport.reimport(1, YearMonth.of(2026, 2));

    assertThat(result.updated()).isEqualTo(1);
    assertThat(invoices.count()).isEqualTo(1);
    assertThat(invoices.findAll().getFirst().getNetAmount()).isEqualByComparingTo("31000");
    assertThat(sourceReferences.count()).isEqualTo(1);
  }

  @Test
  void importNotifiesNewInvoicesSplitByApprovalOutcomeAndStaysQuietOnDuplicates() {
    source.records.add(cost("KSEF-REVIEW", "100"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.PURCHASES));
    var cp = counterparties.findByProfileIdAndTaxIdentifierAndCountry(1, "1111111111", "PL").orElseThrow();
    counterpartyService.addRule(1, cp.id(),
        new com.smartbox.investory.ryczalt.application.RyczaltCounterpartyService.RuleCommand(
            "Auto", "KSEF", null, null, "VEHICLE", "DOMESTIC_PURCHASE",
            new BigDecimal("0.5"), null, true,
            com.smartbox.investory.ryczalt.domain.PaymentVerificationPolicy.NOT_REQUIRED));
    source.records.add(cost("KSEF-AUTO", "200"));
    source.records.add(income("KSEF-SALE", "300"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.PURCHASES, KsefSyncMode.SALES));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.PURCHASES, KsefSyncMode.SALES));

    assertThat(notifier.messages).hasSize(2);
    assertThat(notifier.messages.get(0))
        .startsWith("1:📥 KSeF: 1 new invoice")
        .contains("Needs your approval (1)", "FZ/KSEF-REVIEW · Seller · 100.00 PLN");
    assertThat(notifier.messages.get(1))
        .contains("2 new invoices", "Auto-approved (1)", "cost · FZ/KSEF-AUTO",
            "Needs your approval (1)", "income · FV/KSEF-SALE · Buyer · 300.00 PLN");
  }

  @Test
  void monthEndSummaryReflectsImportedInvoicesAndObligations() {
    source.records.add(income("KSEF-SALE", "12300"));
    source.records.add(cost("KSEF-COST", "100"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES, KsefSyncMode.PURCHASES));
    long periodId = jdbc.queryForObject(
        "SELECT id FROM ryczalt.ryczalt_period WHERE profile_id=1 AND period_year=2026 AND period_month=2",
        Long.class);
    jdbc.update("INSERT INTO ryczalt.ryczalt_obligation(profile_id,period_id,obligation_type,amount,currency,due_date,status)"
        + " VALUES (1,?,'VAT',2829,'PLN','2026-03-25','OPEN'), (1,?,'RYCZALT',1476,'PLN','2026-03-20','OPEN')",
        periodId, periodId);
    var reminders = new com.smartbox.investory.ryczalt.application.RyczaltMonthEndReminderService(
        null, null, jdbc, notifier);

    var summary = reminders.summary(1, YearMonth.of(2026, 2), null);

    assertThat(summary.periodStatus()).isIn("OPEN", "DIRTY");
    assertThat(summary.incomeInvoices()).isEqualTo(1);
    assertThat(summary.incomeNet()).isEqualByComparingTo("12300");
    assertThat(summary.needsReview()).isEqualTo(2);
    assertThat(summary.obligations())
        .extracting(com.smartbox.investory.ryczalt.application.RyczaltMonthEndReminderService.Obligation::type)
        .containsExactly("RYCZALT", "VAT");
    assertThat(reminders.summary(2, YearMonth.of(2026, 2), null).incomeInvoices()).isZero();
  }

  @Test
  void profileIsolationRejectsSyncIntoProfileNotOwningTheKsefNip() {
    source.records.add(income("KSEF-1", "29600"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));

    assertThatThrownBy(() -> ksefImport.sync(2, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES)))
        .isInstanceOf(KsefProfileMismatchException.class);
    assertThatThrownBy(() -> ksefImport.reimport(2, YearMonth.of(2026, 2)))
        .isInstanceOf(KsefProfileMismatchException.class);

    assertThat(invoices.findAll())
        .extracting(RyczaltInvoiceEntity::getProfileId)
        .containsExactly(1L);
    assertThat(sourceReferences.count()).isEqualTo(1);
    assertThat(ksefImport.connectedProfileIds()).containsExactly(1L);
  }

  @Test
  void unconfiguredKsefNipConnectsNoProfile() {
    source.nip = null;
    source.records.add(income("KSEF-1", "29600"));

    assertThat(ksefImport.connectedProfileIds()).isEmpty();
    assertThatThrownBy(() -> ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES)))
        .isInstanceOf(KsefProfileMismatchException.class);
    assertThat(invoices.count()).isZero();
  }

  @Test
  void invoiceReadLoadsCounterpartyIdentifiersInConstantQueriesAndStaysProfileScoped() {
    RyczaltPeriodEntity profileOne =
        periods.save(new RyczaltPeriodEntity(1, 2026, 2, PeriodStatus.OPEN));
    RyczaltPeriodEntity profileTwo =
        periods.save(new RyczaltPeriodEntity(2, 2026, 2, PeriodStatus.OPEN));
    RyczaltCounterpartyEntity identified =
        counterparties.save(new RyczaltCounterpartyEntity(1, "1234567890", "PL", "Identified"));
    RyczaltCounterpartyEntity missingIdentifier =
        counterparties.save(new RyczaltCounterpartyEntity(1, null, "PL", "No identifier"));
    RyczaltCounterpartyEntity otherProfile =
        counterparties.save(new RyczaltCounterpartyEntity(2, "9999999999", "PL", "Other profile"));
    for (int i = 0; i < 8; i++) {
      invoices.save(invoice(profileOne, 1, i % 2 == 0 ? identified : missingIdentifier, i));
    }
    invoices.save(invoice(profileTwo, 2, otherProfile, 99));

    Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    statistics.clear();
    statistics.setStatisticsEnabled(true);

    var rows = invoiceQueries.getInvoices(1, YearMonth.of(2026, 2));

    assertThat(rows).hasSize(8);
    assertThat(rows)
        .extracting(row -> row.counterparty().taxIdentifier())
        .containsExactly(
            "1234567890", null, "1234567890", null, "1234567890", null, "1234567890", null);
    assertThat(statistics.getPrepareStatementCount())
        .as("period lookup + invoice/counterparty fetch + bulk provenance read")
        .isEqualTo(3);
  }

  private RyczaltInvoiceEntity invoice(
      RyczaltPeriodEntity period,
      long profileId,
      RyczaltCounterpartyEntity counterparty,
      int suffix) {
    RyczaltInvoiceEntity invoice =
        new RyczaltInvoiceEntity(
            period,
            profileId,
            InvoiceDirection.INCOME,
            "QUERY-" + profileId + "-" + suffix,
            LocalDate.of(2026, 2, 10),
            LocalDate.of(2026, 2, 10),
            BigDecimal.TEN,
            BigDecimal.ZERO,
            BigDecimal.TEN,
            com.smartbox.investory.shared.currency.CurrencyType.PLN,
            BigDecimal.TEN,
            new BigDecimal("0.12"),
            null);
    invoice.applyCounterpartyRule(
        counterparty,
        false,
        com.smartbox.investory.ryczalt.domain.PaymentVerificationPolicy.REQUIRED);
    return invoice;
  }

  @Test
  void frozenPeriodSkipsItsInvoicesWithoutFailingTheSync() {
    jdbc.update(
        "INSERT INTO ryczalt.ryczalt_period(profile_id, period_year, period_month, status)"
            + " VALUES (1, 2026, 2, 'FROZEN')");
    source.records.add(income("KSEF-1", "29600"));

    var result = ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));

    assertThat(result.failed()).isEqualTo(1);
    assertThat(result.imported()).isZero();
    assertThat(invoices.count()).isZero();
  }

  @Test
  void invoiceChangeMarksCalculatedPeriodDirty() {
    jdbc.update(
        "INSERT INTO ryczalt.ryczalt_period(profile_id, period_year, period_month, status)"
            + " VALUES (1, 2026, 2, 'CALCULATED')");
    source.records.add(income("KSEF-1", "29600"));

    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));

    RyczaltPeriodEntity period = periods.findByProfileIdAndYearAndMonth(1, 2026, 2).orElseThrow();
    assertThat(period.getStatus()).isEqualTo(PeriodStatus.DIRTY);
  }

  private InvoiceSourceRecord dateCorrection() {
    return new InvoiceSourceRecord("DATE-CORRECTION", InvoiceDirection.INCOME, "COR/EXAMPLE",
        LocalDate.of(2026, 2, 20), LocalDate.of(2026, 1, 31),
        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "PLN", "Buyer", "2222222222",
        null, null, "PL", new InvoiceSourceRecord.SaleDateCorrection("ORIGINAL", "FV/ORIGINAL",
            LocalDate.of(2026, 2, 10), LocalDate.of(2026, 1, 31), "Sale date corrected"));
  }

  @Test
  void dateCorrectionMovesOriginalAndPreservesPaymentAndAmountsAcrossRepeatImports() {
    source.records.add(income("ORIGINAL", "1000"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));
    var original = invoices.findAll().getFirst();
    original.markManuallyPaid(LocalDate.of(2026, 2, 12), "Confirmed payment");
    invoices.save(original);
    long periodId = jdbc.queryForObject("SELECT period_id FROM ryczalt.ryczalt_invoice WHERE id=?", Long.class, original.id());
    jdbc.update("INSERT INTO ryczalt.ryczalt_transaction(profile_id,period_id,booking_date,amount,currency) VALUES (1,?,'2026-02-12',100,'PLN')", periodId);
    jdbc.update("INSERT INTO ryczalt.ryczalt_obligation(profile_id,period_id,obligation_type,amount,currency,status) VALUES (1,?,'VAT',100,'PLN','PAID')", periodId);
    jdbc.update("INSERT INTO ryczalt.ryczalt_payment_match(profile_id,obligation_id,transaction_id,matched_amount,match_type) SELECT 1,o.id,t.id,100,'MANUAL' FROM ryczalt.ryczalt_obligation o JOIN ryczalt.ryczalt_transaction t ON t.period_id=o.period_id WHERE o.period_id=?", periodId);
    String payments = jdbc.queryForObject("SELECT jsonb_agg(to_jsonb(m))::text FROM ryczalt.ryczalt_payment_match m", String.class);
    source.records.addFirst(dateCorrection()); // Original must be processed before its correction.

    assertThat(ksefImport.reimport(1, YearMonth.of(2026, 2)).updated()).isEqualTo(2);
    assertThat(ksefImport.reimport(1, YearMonth.of(2026, 2)).duplicates()).isEqualTo(2);
    var corrected = invoices.findByIdAndProfileId(original.id(), 1).orElseThrow();
    assertThat(invoices.count()).isEqualTo(1);
    assertThat(corrected.getAccountingDate()).isEqualTo(LocalDate.of(2026, 1, 31));
    assertThat(jdbc.queryForObject("SELECT p.period_month FROM ryczalt.ryczalt_period p JOIN ryczalt.ryczalt_invoice i ON i.period_id=p.id WHERE i.id=?", Integer.class, original.id())).isEqualTo(1);
    assertThat(corrected.getIssueDate()).isEqualTo(LocalDate.of(2026, 2, 10));
    assertThat(corrected.getNetAmount()).isEqualByComparingTo("1000");
    assertThat(corrected.getGrossAmount()).isEqualByComparingTo("1000");
    assertThat(corrected.getPaymentStatus()).isEqualTo("MANUALLY_CONFIRMED");
    assertThat(corrected.getManualPaidDate()).isEqualTo(LocalDate.of(2026, 2, 12));
    assertThat(jdbc.queryForObject("SELECT count(*) FROM ryczalt.ryczalt_correction", Long.class)).isEqualTo(1);
    assertThat(jdbc.queryForObject("SELECT jsonb_agg(to_jsonb(m))::text FROM ryczalt.ryczalt_payment_match m", String.class)).isEqualTo(payments);
    assertThat(jdbc.queryForObject("SELECT count(*) FROM ryczalt.ryczalt_transaction", Long.class)).isEqualTo(1);
  }

  @Test
  void dateCorrectionCannotUseAnotherProfilesOriginal() {
    source.records.add(income("ORIGINAL", "1000"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));
    source.records.clear();
    source.records.add(dateCorrection());
    source.nip = PROFILE_TWO_NIP; // Profile 2's own KSeF context must not reach profile 1 data.
    assertThat(ksefImport.sync(2, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES)).failed()).isEqualTo(1);
    assertThat(invoices.findAll().getFirst().getAccountingDate()).isEqualTo(LocalDate.of(2026, 2, 10));
    assertThat(jdbc.queryForObject("SELECT count(*) FROM ryczalt.ryczalt_correction", Long.class)).isZero();
  }

  @Test
  void dateCorrectionRejectsFrozenTargetWithoutPartialHistory() {
    source.records.add(income("ORIGINAL", "1000"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));
    periods.save(new RyczaltPeriodEntity(1, 2026, 1, PeriodStatus.FROZEN));
    source.records.clear();
    source.records.add(dateCorrection());
    assertThatThrownBy(() -> ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES)))
        .isInstanceOf(FrozenPeriodMutationException.class);
    assertThat(invoices.findAll().getFirst().getAccountingDate()).isEqualTo(LocalDate.of(2026, 2, 10));
    assertThat(jdbc.queryForObject("SELECT count(*) FROM ryczalt.ryczalt_correction", Long.class)).isZero();
  }

  @Test
  void sharedCorrectionIsAppliedOnceWithinEachProfile() {
    source.records.add(income("ORIGINAL", "1000"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));
    source.nip = PROFILE_TWO_NIP;
    ksefImport.sync(2, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));
    source.records.clear();
    source.records.add(dateCorrection());
    source.nip = PROFILE_ONE_NIP;
    assertThat(ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES)).updated()).isEqualTo(1);
    source.nip = PROFILE_TWO_NIP;
    assertThat(ksefImport.sync(2, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES)).updated()).isEqualTo(1);
    assertThat(invoices.count()).isEqualTo(2);
    assertThat(invoices.findAll()).allSatisfy(row ->
        assertThat(row.getAccountingDate()).isEqualTo(LocalDate.of(2026, 1, 31)));
    assertThat(jdbc.queryForObject("SELECT count(*) FROM ryczalt.ryczalt_correction", Long.class)).isEqualTo(2);
  }

  @Test
  void correctionInvalidatesBothOldAndNewAccountingMonths() {
    source.records.add(income("ORIGINAL", "1000"));
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));
    periods.save(new RyczaltPeriodEntity(1, 2026, 1, PeriodStatus.CALCULATED));
    jdbc.update("UPDATE ryczalt.ryczalt_period SET status='CALCULATED' WHERE profile_id=1");
    jdbc.update("INSERT INTO ryczalt.ryczalt_calculation(profile_id,period_id,calculation_type,status,is_current,result_json,input_fingerprint,rule_version,calculator_version,calculated_at) SELECT profile_id,id,'RYCZALT','CURRENT',true,'{}','test','test','test',CURRENT_TIMESTAMP FROM ryczalt.ryczalt_period WHERE profile_id=1");
    source.records.clear();
    source.records.add(dateCorrection());
    ksefImport.sync(1, YearMonth.of(2026, 2), Set.of(KsefSyncMode.SALES));
    assertThat(jdbc.queryForObject("SELECT count(*) FROM ryczalt.ryczalt_calculation WHERE is_current", Long.class)).isZero();
    assertThat(jdbc.queryForObject("SELECT count(*) FROM ryczalt.ryczalt_period WHERE status='DIRTY'", Long.class)).isEqualTo(2);
  }

  /** In-memory stand-in for the external KSeF transport. */
  static class ProgrammableInvoiceSource implements InvoiceSourcePort {
    final List<InvoiceSourceRecord> records = new ArrayList<>();
    String nip;

    @Override
    public List<InvoiceSourceRecord> fetch(KsefSyncCommand command) {
      return List.copyOf(records);
    }

    @Override
    public java.util.Optional<String> taxpayerNip() {
      return java.util.Optional.ofNullable(nip);
    }
  }

  /** Captures notifications instead of sending them. */
  static class RecordingNotifier implements com.smartbox.investory.notifications.Notifier {
    final List<String> messages = new ArrayList<>();

    @Override
    public void notifyProfile(long profileId, String text) {
      messages.add(profileId + ":" + text);
    }

    @Override
    public void notifyOperators(String text) {
      messages.add("ops:" + text);
    }
  }

  @Configuration(proxyBeanMethods = false)
  @EnableAutoConfiguration
  @EntityScan(basePackageClasses = RyczaltPeriodEntity.class)
  @EnableJpaRepositories(
      basePackageClasses = {
        RyczaltPeriodJpaRepository.class,
        RyczaltInvoiceJpaRepository.class,
        com.smartbox.investory.ryczalt.persistence.RyczaltCounterpartyJpaRepository.class,
        com.smartbox.investory.ryczalt.persistence.RyczaltCounterpartyRuleJpaRepository.class,
        RyczaltSourceReferenceJpaRepository.class,
        RyczaltObligationJpaRepository.class,
        com.smartbox.investory.ryczalt.persistence.RyczaltCalculationJpaRepository.class
      })
  @Import({
    RyczaltKsefImportService.class,
    com.smartbox.investory.ryczalt.application.ksef.RyczaltKsefDateCorrectionService.class,
    com.smartbox.investory.ryczalt.persistence.JdbcRyczaltCorrectionWriter.class,
    RyczaltInvoiceQueryService.class,
    com.smartbox.investory.ryczalt.application.RyczaltCounterpartyService.class,
    RyczaltPeriodLifecycleService.class,
    com.smartbox.investory.ryczalt.persistence.JdbcRyczaltAuditEventWriter.class
  })
  static class TestConfiguration {
    @Bean
    RyczaltAutoRecalculationService autoRecalculationService() {
      return org.mockito.Mockito.mock(RyczaltAutoRecalculationService.class);
    }

    @Bean
    ProgrammableInvoiceSource programmableInvoiceSource() {
      return new ProgrammableInvoiceSource();
    }

    @Bean
    RecordingNotifier recordingNotifier() {
      return new RecordingNotifier();
    }

    @Bean
    RyczaltFxRateService fxRateService() {
      return org.mockito.Mockito.mock(RyczaltFxRateService.class);
    }
  }

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", DATABASE::jdbcUrl);
    registry.add("spring.datasource.username", DATABASE::username);
    registry.add("spring.datasource.password", DATABASE::password);
    registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
    registry.add("spring.flyway.enabled", () -> "false");
    registry.add("spring.jpa.properties.hibernate.generate_statistics", () -> "true");
  }
}
