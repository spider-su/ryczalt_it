package com.smartbox.investory.ui.accounting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.smartbox.investory.ui.auth.AuthenticatedRyczaltSession;
import com.smartbox.investory.ui.auth.BackendAuthClient;
import com.smartbox.investory.ui.auth.BackendAuthException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

class HttpRyczaltWebAccountingClientTest {
  private static final long PROFILE = 42;

  @AfterEach
  void clearContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void mapsPeriodInvoicesAndObligationsAndForwardsUserBearer() {
    RestClient.Builder builder = RestClient.builder().baseUrl("http://backend.test");
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    var client = client(builder);
    server
        .expect(requestTo("http://backend.test/api/profiles/42/accounting/periods/2026-01"))
        .andExpect(method(HttpMethod.GET))
        .andExpect(header("Authorization", "Bearer user-token"))
        .andRespond(
            withSuccess(
                """
                {"month":"2026-01","status":"OPEN","calculations":[],"summary":{"revenue":"10.00","ryczalt":"1.20","vat":"0","zus":"0"},"audit":{"revenue":"10","socialDeduction":"0","healthDeduction":"0","otherDeduction":"0","taxableBase":"10","cumulativeTax":"1","monthlyAdvance":"1","outputVat":"0","inputVat":"0","vatAdjustments":"0","finalPayable":"1"},"documents":{"invoiceCount":1,"transactionCount":2},"settlement":{"expectedCount":0,"paidCount":0,"outstandingCount":0,"totalExpected":"0","totalPaid":"0","totalOutstanding":"0","fullySettled":true},"reconciliation":{"rowCount":0,"settledCount":0,"mismatchCount":0,"missingEvidenceCount":0},"completeness":{"status":"COMPLETE","blockingIssueCount":0},"allowedActions":[]}
                """,
                MediaType.APPLICATION_JSON));
    server
        .expect(
            requestTo("http://backend.test/api/profiles/42/accounting/periods/2026-01/invoices"))
        .andExpect(header("Authorization", "Bearer user-token"))
        .andRespond(
            withSuccess(
                "[{\"id\":5,\"direction\":\"INCOME\",\"reference\":\"INV-5\",\"issueDate\":\"2026-01-02\",\"accountingDate\":\"2026-01-02\",\"netAmount\":\"10.00\",\"vatAmount\":\"2.30\",\"grossAmount\":\"12.30\",\"currency\":\"PLN\",\"approvalStatus\":\"APPROVED\",\"approvalMethod\":\"MANUAL\",\"paymentVerificationPolicy\":\"REQUIRED\",\"paymentStatus\":\"UNPAID\",\"counterparty\":{\"id\":8,\"legalName\":\"Acme sp z oo\",\"alias\":\"Acme\",\"taxIdentifier\":null}}]",
                MediaType.APPLICATION_JSON));
    server
        .expect(
            requestTo("http://backend.test/api/profiles/42/accounting/periods/2026-01/obligations"))
        .andExpect(header("Authorization", "Bearer user-token"))
        .andRespond(
            withSuccess(
                "[{\"id\":3,\"type\":\"PIT\",\"expected\":\"4.00\",\"paid\":\"1.00\",\"outstanding\":\"3.00\",\"currency\":\"PLN\",\"dueDate\":\"2026-02-20\",\"status\":\"PARTIAL\",\"manuallyPaid\":false,\"manualPaidDate\":null}]",
                MediaType.APPLICATION_JSON));
    server
        .expect(requestTo("http://backend.test/api/profiles/42/accounting/counterparties"))
        .andExpect(header("Authorization", "Bearer user-token"))
        .andRespond(
            withSuccess(
                "[{\"id\":8,\"legalName\":\"Acme sp z"
                    + " oo\",\"alias\":\"Acme\",\"displayName\":\"Acme\",\"taxIdentifier\":\"123\",\"country\":\"PL\",\"bankAccount\":null,\"ruleCount\":1,\"invoiceCount\":1}]",
                MediaType.APPLICATION_JSON));

    var period = client.period(PROFILE, YearMonth.of(2026, 1));
    var invoice = client.invoices(PROFILE, YearMonth.of(2026, 1)).getFirst();
    var obligation = client.obligations(PROFILE, YearMonth.of(2026, 1)).getFirst();
    var counterparty = client.counterparties(PROFILE).getFirst();
    assertThat(period.summary().revenue()).isEqualByComparingTo("10.00");
    assertThat(period.documents().invoices()).isEqualTo(1);
    assertThat(invoice.counterparty()).isEqualTo("Acme");
    assertThat(invoice.grossAmount()).isEqualByComparingTo("12.30");
    assertThat(obligation.outstanding()).isEqualByComparingTo("3.00");
    assertThat(counterparty.displayName()).isEqualTo("Acme");
    server.verify();
  }

  @Test
  void mapsInvoiceCounterpartyAliasAndFallsBackToLegalName() {
    RestClient.Builder builder = RestClient.builder().baseUrl("http://backend.test");
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    var client = client(builder);
    server
        .expect(
            requestTo("http://backend.test/api/profiles/42/accounting/periods/2026-01/invoices"))
        .andRespond(
            withSuccess(
                """
                [
                  {"id":1,"direction":"INCOME","reference":"INV-1","counterparty":{"id":8,"legalName":"Acme sp z oo","alias":"Acme","taxIdentifier":null}},
                  {"id":2,"direction":"COST","reference":"BILL-2","counterparty":{"id":9,"legalName":"Legal Name Ltd","alias":null,"taxIdentifier":null}}
                ]
                """,
                MediaType.APPLICATION_JSON));

    var invoices = client.invoices(PROFILE, YearMonth.of(2026, 1));

    assertThat(invoices).hasSize(2);
    assertThat(invoices.get(0).counterparty()).isEqualTo("Acme");
    assertThat(invoices.get(1).counterparty()).isEqualTo("Legal Name Ltd");
    server.verify();
  }

  @Test
  void sendsMutationBodiesAndMultipartFileWithAuth() {
    RestClient.Builder builder = RestClient.builder().baseUrl("http://backend.test");
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    var client = client(builder);
    server
        .expect(
            requestTo(
                "http://backend.test/api/profiles/42/accounting/periods/2026-01/obligations/3/manual-paid"))
        .andExpect(method(HttpMethod.POST))
        .andExpect(header("Authorization", "Bearer user-token"))
        .andExpect(jsonPath("$.paidDate").value("2026-02-20"))
        .andRespond(withSuccess());
    server
        .expect(
            requestTo("http://backend.test/api/profiles/42/accounting/counterparties/8/rules/11"))
        .andExpect(method(HttpMethod.PUT))
        .andExpect(header("Authorization", "Bearer user-token"))
        .andExpect(jsonPath("$.classification").value("PL_SERVICE"))
        .andRespond(withSuccess());
    server
        .expect(requestTo("http://backend.test/api/profiles/42/accounting/invoices/recognize"))
        .andExpect(method(HttpMethod.POST))
        .andExpect(header("Authorization", "Bearer user-token"))
        .andExpect(content().contentTypeCompatibleWith(MediaType.MULTIPART_FORM_DATA))
        .andExpect(
            content().string(org.hamcrest.Matchers.containsString("filename=\"invoice.pdf\"")))
        .andRespond(
            withSuccess(
                "{\"candidateKey\":\"00000000-0000-0000-0000-000000000001\",\"sourceType\":\"UPLOAD\",\"documentType\":\"INVOICE\",\"direction\":\"INCOME\",\"issueDate\":\"2026-01-02\",\"reference\":\"INV\",\"currency\":\"PLN\",\"netAmount\":\"1\",\"vatAmount\":\"0.23\",\"grossAmount\":\"1.23\",\"approvalStatus\":\"PENDING\",\"approvalMethod\":\"MANUAL\",\"paymentVerificationPolicy\":\"REQUIRED\",\"ruleMatchStatus\":\"NO_MATCH\",\"paymentStatus\":\"UNPAID\",\"sourceState\":\"NEW_CANDIDATE\",\"periodYear\":2026,\"periodMonth\":1,\"requiredInputs\":[{\"field\":\"classification\",\"required\":true}]}",
                MediaType.APPLICATION_JSON));

    client.manualObligationPaid(
        PROFILE, YearMonth.of(2026, 1), 3, LocalDate.of(2026, 2, 20), "note");
    client.updateRule(
        PROFILE,
        8,
        11,
        new RyczaltWebAccountingClient.RuleForm(
            "Rule", "UPLOAD", "INVOICE", null, "PL_SERVICE", null, null, "8.5", false, "REQUIRED"));
    var candidate =
        client.recognize(PROFILE, "invoice.pdf", "application/pdf", new byte[] {1, 2, 3});
    assertThat(candidate.candidateKey())
        .isEqualTo(java.util.UUID.fromString("00000000-0000-0000-0000-000000000001"));
    assertThat(candidate.requiredInputs()).containsExactly("classification");
    server.verify();
  }

  @Test
  void mapsBackendAuthorizationFailureToTypedError() {
    RestClient.Builder builder = RestClient.builder().baseUrl("http://backend.test");
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    var client = client(builder);
    server
        .expect(requestTo("http://backend.test/api/profiles/42/accounting/periods"))
        .andRespond(withStatus(HttpStatus.FORBIDDEN).body("private detail"));
    assertThatThrownBy(() -> client.periods(PROFILE))
        .isInstanceOf(BackendAuthException.class)
        .hasMessageContaining("FORBIDDEN")
        .hasMessageNotContaining("private detail");
    server.verify();
  }

  private static HttpRyczaltWebAccountingClient client(RestClient.Builder builder) {
    var profile = new BackendAuthClient.Profile(PROFILE, "Test", "OWNER");
    var identity =
        new BackendAuthClient.CurrentProfileResponse("person", profile, List.of(profile));
    var session =
        new AuthenticatedRyczaltSession(
            "person", "user-token", Instant.now().plusSeconds(300), identity);
    SecurityContextHolder.getContext()
        .setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(session, null, List.of()));
    return new HttpRyczaltWebAccountingClient(builder.build(), JsonMapper.builder().build());
  }
}
