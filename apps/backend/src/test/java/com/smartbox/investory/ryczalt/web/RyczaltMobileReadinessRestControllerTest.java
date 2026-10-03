package com.smartbox.investory.ryczalt.web;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartbox.investory.config.AuthorizationService;
import com.smartbox.investory.ryczalt.application.RyczaltMobileReadinessService;
import java.time.Instant;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class RyczaltMobileReadinessRestControllerTest {
  private final RyczaltMobileReadinessService readiness = mock(RyczaltMobileReadinessService.class);
  private final AuthorizationService authorization = mock(AuthorizationService.class);
  private final Authentication authentication = mock(Authentication.class);
  private MockMvc mvc;

  @BeforeEach
  void setUp() {
    when(authorization.canRead(7L, authentication)).thenReturn(true);
    when(authorization.canWrite(7L, authentication)).thenReturn(true);
    when(authentication.getName()).thenReturn("owner@example.test");
    mvc = MockMvcBuilders.standaloneSetup(
        new RyczaltMobileReadinessRestController(readiness, authorization)).build();
  }

  @Test
  void exposesProfileScopedPersistedReadiness() throws Exception {
    when(readiness.readiness(7L, YearMonth.of(2026, 9))).thenReturn(
        new RyczaltMobileReadinessService.Readiness(false, false, false, false,
            new RyczaltMobileReadinessService.KsefState("NOT_CONNECTED", "NOT_AVAILABLE"),
            new RyczaltMobileReadinessService.PeriodState("2026-09", "HISTORICAL_DATA_MISSING", null),
            List.of(), List.of(new RyczaltMobileReadinessService.ReadinessItem(
                "ACCOUNTING_CONFIGURATION", "ACTION_REQUIRED", "CONFIGURE_ACCOUNTING_START")), false));

    mvc.perform(get("/api/profiles/7/accounting/readiness")
            .queryParam("month", "2026-09").principal(authentication))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.period.state").value("HISTORICAL_DATA_MISSING"))
        .andExpect(jsonPath("$.accountingConfigured").value(false))
        .andExpect(jsonPath("$.items[0].action").value("CONFIGURE_ACCOUNTING_START"));

    verify(readiness).readiness(7L, YearMonth.of(2026, 9));
  }

  @Test
  void confirmsNoRevenueUsingTheProfileScopedActivityRoute() throws Exception {
    when(readiness.confirmNoRevenue(7L, YearMonth.of(2026, 9), "owner@example.test"))
        .thenReturn(new RyczaltMobileReadinessService.Confirmation(
            "NO_REVENUE", Instant.parse("2026-10-01T00:00:00Z")));

    mvc.perform(post("/api/profiles/7/accounting/periods/2026-09/activity-confirmation")
            .principal(authentication).contentType("application/json")
            .content("{\"type\":\"NO_REVENUE\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.type").value("NO_REVENUE"))
        .andExpect(jsonPath("$.confirmedAt").value("2026-10-01T00:00:00Z"));
  }

  @Test
  void rejectsUnsupportedActivityConfirmationTypes() throws Exception {
    mvc.perform(post("/api/profiles/7/accounting/periods/2026-09/activity-confirmation")
            .principal(authentication).contentType("application/json")
            .content("{\"type\":\"NO_ACTIVITY\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void readinessRequiresProfileMembership() throws Exception {
    when(authorization.canRead(7L, authentication)).thenReturn(false);

    mvc.perform(get("/api/profiles/7/accounting/readiness")
            .queryParam("month", "2026-09").principal(authentication))
        .andExpect(status().isForbidden());
  }

  @Test
  void activityConfirmationRequiresProfileOwnerWriteAccess() throws Exception {
    when(authorization.canWrite(7L, authentication)).thenReturn(false);

    mvc.perform(post("/api/profiles/7/accounting/periods/2026-09/activity-confirmation")
            .principal(authentication).contentType("application/json")
            .content("{\"type\":\"NO_REVENUE\"}"))
        .andExpect(status().isForbidden());
  }
}
