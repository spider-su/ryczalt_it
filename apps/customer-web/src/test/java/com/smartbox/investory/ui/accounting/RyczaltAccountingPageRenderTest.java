package com.smartbox.investory.ui.accounting;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartbox.investory.ui.auth.BackendAuthClient;
import com.smartbox.investory.ui.auth.BackendAuthClient.CurrentProfileResponse;
import com.smartbox.investory.ui.auth.BackendAuthClient.LoginResponse;
import com.smartbox.investory.ui.auth.BackendAuthClient.Profile;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "ryczalt.backend.base-url=http://backend.test")
@AutoConfigureMockMvc
class RyczaltAccountingPageRenderTest {
  @Autowired MockMvc mvc;
  @MockitoBean BackendAuthClient backend;
  @MockitoBean RyczaltWebAccountingClient accounting;

  @Test
  void paymentConflictReturnsToAccountingWithTheActualReason() throws Exception {
    var session = loginSession();
    org.mockito.Mockito.doThrow(new org.springframework.web.server.ResponseStatusException(
        org.springframework.http.HttpStatus.CONFLICT, "Frozen period cannot be changed"))
        .when(accounting).manualObligationPaid(7L,YearMonth.of(2026,8),21L,LocalDate.of(2026,8,25),null);
    mvc.perform(post("/profiles/7/accounting/obligations/21/manual-paid").session(session).with(csrf())
        .param("month","2026-08").param("paidDate","2026-08-25"))
        .andExpect(status().is3xxRedirection())
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl("/profiles/7/accounting?month=2026-08"))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.flash()
            .attribute("accountingError","Frozen period cannot be changed"));
  }

  @Test
  void missingInputFormRendersEmptyValuesAndRequiresExplicitTaxpayerFacts() throws Exception {
    var session = loginSession();
    when(accounting.inputSettings(7L, YearMonth.of(2026, 1)))
        .thenReturn(new RyczaltWebAccountingClient.InputSettings(null, null,
            List.of("accountingStartDate", "healthContributionPaidOverride")));
    var html = mvc.perform(get("/profiles/7/accounting/periods/2026-01/input-settings").session(session))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    org.assertj.core.api.Assertions.assertThat(html)
        .contains("Required facts are missing", "Opening state", "Social contributions actually paid",
            "Health contributions actually paid", "name=\"_csrf\"")
        .doesNotContain("value=\"0\"");
  }

  @Test
  void inputFormDoesNotSaveMissingAmountsOrInventZero() throws Exception {
    var session = loginSession();
    when(accounting.inputSettings(7L, YearMonth.of(2026, 1)))
        .thenReturn(new RyczaltWebAccountingClient.InputSettings(null, null, List.of("accountingStartDate")));
    mvc.perform(post("/profiles/7/accounting/periods/2026-01/input-settings")
        .session(session).with(csrf()).param("jdgActive", "true")
        .param("qualifyingUop", "false").param("voluntarySickness", "false"))
        .andExpect(status().isOk())
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.model()
            .attribute("accountingError", org.hamcrest.Matchers.containsString("Social contributions actually paid")));
    org.mockito.Mockito.verify(accounting, org.mockito.Mockito.never())
        .saveInputSettings(org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
  }

  @Test
  void inputFormSavesExplicitZeroAndOpeningValues() throws Exception {
    var session = loginSession();
    when(accounting.inputSettings(7L, YearMonth.of(2026, 1)))
        .thenReturn(new RyczaltWebAccountingClient.InputSettings(null, null, List.of("accountingStartDate")));
    var request = post("/profiles/7/accounting/periods/2026-01/input-settings")
        .session(session).with(csrf()).param("jdgActive", "true")
        .param("qualifyingUop", "false").param("voluntarySickness", "false")
        .param("accountingStartDate", "2026-01-01");
    for (var field : RyczaltAccountingInputController.MONTHLY) {
      if (field.required()) request.param(field.name(), "0");
    }
    request.param("healthContributionPaidOverride", "0");
    for (var field : RyczaltAccountingInputController.OPENING) request.param(field.name(), "0");
    mvc.perform(request).andExpect(status().is3xxRedirection());
    org.mockito.Mockito.verify(accounting).saveInputSettings(
        org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.eq(YearMonth.of(2026, 1)),
        org.mockito.ArgumentMatchers.argThat(values ->
            BigDecimal.ZERO.equals(values.get("healthContributionPaidOverride"))
                && BigDecimal.ZERO.equals(values.get("openingVatCarryForward"))
                && "2026-01-01".equals(values.get("accountingStartDate"))));
  }

  @Test
  void blankPaidHealthIsSentAsNullForCalculatedHealthDefault() throws Exception {
    when(accounting.inputSettings(7L, YearMonth.of(2026, 2)))
        .thenReturn(new RyczaltWebAccountingClient.InputSettings(null,
            java.time.LocalDate.of(2026, 1, 1), List.of()));
    var request = post("/profiles/7/accounting/periods/2026-02/input-settings")
        .session(loginSession()).with(csrf()).param("jdgActive", "true")
        .param("qualifyingUop", "true").param("voluntarySickness", "false")
        .param("healthContributionPaidOverride", "");
    for (var field : RyczaltAccountingInputController.MONTHLY) {
      if (field.required()) request.param(field.name(), "0");
    }
    mvc.perform(request).andExpect(status().is3xxRedirection());
    org.mockito.Mockito.verify(accounting).saveInputSettings(
        org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.eq(YearMonth.of(2026, 2)),
        org.mockito.ArgumentMatchers.argThat(values ->
            values.containsKey("healthContributionPaidOverride")
                && values.get("healthContributionPaidOverride") == null));
  }

  @Test
  void rendersMappedBalancesCurrencyRevenueWarningAndOnlyValidPaymentAction() throws Exception {
    var session = loginSession();

    YearMonth month = YearMonth.of(2026, 8);
    var period =
        new RyczaltWebAccountingClient.Period(
            month,
            "OPEN",
            List.of(),
            new RyczaltWebAccountingClient.Summary(
                new BigDecimal("1300.00"), new BigDecimal("100"), new BigDecimal("50"), new BigDecimal("20")),
            new RyczaltWebAccountingClient.Audit(
                new BigDecimal("1234.56"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                new BigDecimal("1234.56"), new BigDecimal("100"), new BigDecimal("100"),
                new BigDecimal("50"), BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("50")),
            new RyczaltWebAccountingClient.Documents(1, 0),
            new RyczaltWebAccountingClient.Settlement(
                3, 1, 2, new BigDecimal("170"), new BigDecimal("50"), new BigDecimal("120"), false),
            new RyczaltWebAccountingClient.Reconciliation(0, 0, 0, 0),
            new RyczaltWebAccountingClient.Completeness("COMPLETE", 0),
            List.of());
    when(accounting.periods(7)).thenReturn(List.of(new RyczaltWebAccountingClient.Month(month, "OPEN")));
    when(accounting.period(7, month)).thenReturn(period);
    when(accounting.invoices(7, month)).thenReturn(
        List.of(new RyczaltWebAccountingClient.Invoice(
            1, "INCOME", "INV-1", LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 10),
            new BigDecimal("1003.71"), new BigDecimal("230.85"), new BigDecimal("1234.56"),
            "PLN", "APPROVED", "MANUAL", "REQUIRED", "MATCHED", "Client")));
    when(accounting.transactions(7, month)).thenReturn(List.of());
    when(accounting.obligations(7, month)).thenReturn(List.of(
        obligation("RYCZALT", "100.00", "0.00", "100.00", "OPEN"),
        obligation("VAT", "50.00", "50.00", "0.00", "PAID"),
        obligation("ZUS", "20.00", "0.00", "20.00", "OPEN")));
    when(accounting.referenceObligations(7, month)).thenReturn(List.of());
    when(accounting.issues(7, month)).thenReturn(List.of());
    when(accounting.counterparties(7)).thenReturn(List.of());

    var response = mvc.perform(get("/profiles/7/accounting?month=2026-08")
            .session(session))
        .andExpect(status().isOk()).andReturn();
    String html = response.getResponse().getContentAsString();

    org.assertj.core.api.Assertions.assertThat(html)
        .contains("1.234,56 PLN", "100,00", "REVENUE_MISMATCH")
        .contains("Confirm paid")
        .doesNotContain("action=\"/profiles/7/accounting/obligations/2/manual-paid\"");
  }

  @Test
  void unknownAuditValuesRenderAsDashesAndWaivedInvoicesHaveNoPaymentAction() throws Exception {
    var month = YearMonth.of(2026, 8);
    var period = new RyczaltWebAccountingClient.Period(month, "DIRTY", List.of(),
        new RyczaltWebAccountingClient.Summary(BigDecimal.ZERO, null, null, null),
        new RyczaltWebAccountingClient.Audit(null, null, null, null, null, null, null, null, null, null, null),
        new RyczaltWebAccountingClient.Documents(1, 0),
        new RyczaltWebAccountingClient.Settlement(0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, true),
        new RyczaltWebAccountingClient.Reconciliation(0, 0, 0, 0),
        new RyczaltWebAccountingClient.Completeness("INCOMPLETE", 1), List.of());
    when(accounting.periods(7)).thenReturn(List.of(new RyczaltWebAccountingClient.Month(month, "DIRTY")));
    when(accounting.period(7, month)).thenReturn(period);
    when(accounting.invoices(7, month)).thenReturn(List.of(new RyczaltWebAccountingClient.Invoice(
        42, "COST", "SYNTHETIC-COST", LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 10),
        new BigDecimal("100"), new BigDecimal("23"), new BigDecimal("123"), "PLN", "APPROVED",
        "MANUAL", "NOT_REQUIRED", "NOT_REQUIRED", "Synthetic supplier")));
    String html = mvc.perform(get("/profiles/7/accounting?month=2026-08").session(loginSession()))
        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    org.assertj.core.api.Assertions.assertThat(html)
        .contains("Payment check waived")
        .doesNotContain("/invoices/42/manual-paid", "/invoices/42/manual-unpaid");
    String audit = html.substring(html.indexOf("id=\"audit\""), html.indexOf("id=\"income\""));
    org.assertj.core.api.Assertions.assertThat(audit).contains("<td>—</td>").doesNotContain("<td>0,00</td>");
  }

  @Test
  void counterpartyListUsesPlaceholderForMissingTaxId() throws Exception {
    var session = loginSession();
    when(accounting.counterparties(7))
        .thenReturn(List.of(new RyczaltWebAccountingClient.Counterparty(
            14, "Anwim Spółka Akcyjna", null, "Anwim", null, "PL", null, 0, 1)));

    String html = mvc.perform(get("/profiles/7/accounting/counterparties").session(session))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();

    org.assertj.core.api.Assertions.assertThat(html)
        .contains("PL · —")
        .doesNotContain("PL · null");
  }

  private org.springframework.mock.web.MockHttpSession loginSession() throws Exception {
    var profile = new Profile(7, "Main", "OWNER");
    when(backend.login("tester", "secret"))
        .thenReturn(new LoginResponse("token", null, "Bearer", 3600));
    when(backend.me("token"))
        .thenReturn(new CurrentProfileResponse("tester", profile, List.of(profile)));
    var login =
        mvc.perform(post("/login").with(csrf()).param("username", "tester").param("password", "secret"))
            .andExpect(status().is3xxRedirection())
            .andReturn();
    return (org.springframework.mock.web.MockHttpSession) login.getRequest().getSession(false);
  }

  private static RyczaltWebAccountingClient.Obligation obligation(
      String type, String expected, String paid, String outstanding, String status) {
    return new RyczaltWebAccountingClient.Obligation(
        type.equals("RYCZALT") ? 1 : type.equals("VAT") ? 2 : 3,
        type,
        new BigDecimal(expected),
        new BigDecimal(paid),
        new BigDecimal(outstanding),
        "PLN",
        LocalDate.of(2026, 9, 20),
        status,
        false,
        null);
  }
}
