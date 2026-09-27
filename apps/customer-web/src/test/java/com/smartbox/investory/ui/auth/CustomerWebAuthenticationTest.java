package com.smartbox.investory.ui.auth;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.smartbox.investory.ui.accounting.RyczaltWebAccountingClient;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "ryczalt.backend.base-url=http://backend.test",
      "ryczalt.landing.public-base-url=https://ryczalt.example.test"
    })
@AutoConfigureMockMvc
class CustomerWebAuthenticationTest {
  @Autowired MockMvc mvc;
  @Autowired ApplicationContext context;
  @MockitoBean BackendAuthClient backend;

  @Test
  void productionAccountingHttpAdapterIsWiredWithoutContactingBackend() {
    org.assertj.core.api.Assertions.assertThat(
            context.getBeansOfType(RyczaltWebAccountingClient.class).values())
        .singleElement()
        .extracting(value -> value.getClass().getSimpleName())
        .isEqualTo("HttpRyczaltWebAccountingClient");
  }

  @Test
  void anonymousCanSeeLoginButCannotOpenAccounting() throws Exception {
    mvc.perform(get("/login")).andExpect(status().isOk());
    mvc.perform(get("/profiles/7/accounting"))
        .andExpect(status().is3xxRedirection())
        .andExpect(redirectedUrl("/login"));
  }

  @Test
  void rentalSeoLandingIsPublicIndexableAndContainsNoProfileData() throws Exception {
    var response = mvc.perform(get("/ryczalt-najem")).andExpect(status().isOk()).andReturn();
    String html = response.getResponse().getContentAsString();

    org.assertj.core.api.Assertions.assertThat(html)
        .contains("Ryczałt z najmu prywatnego — prosto, bez Excela")
        .contains("Ryczałt od najmu prywatnego – aplikacja do czynszu i podatku | Ryczałt")
        .contains("name=\"robots\" content=\"index,follow\"")
        .contains("rel=\"canonical\" href=\"https://ryczalt.example.test/ryczalt-najem\"")
        .contains("application/ld+json")
        .contains("FAQPage")
        .contains("Kalkulator ryczałtu od najmu")
        .contains("monthly-rent")
        .doesNotContain("server-only-token", "SPRING_SECURITY_CONTEXT", "profileId");
  }

  @Test
  void landingAssetsArePubliclyServed() throws Exception {
    mvc.perform(get("/js/rental-calculator.js")).andExpect(status().isOk());
    mvc.perform(get("/css/rental-landing.css")).andExpect(status().isOk());
  }

  @Test
  void ryczaltItSeoLandingIsPublicAndExplainsSupportedAccountingScope() throws Exception {
    var response = mvc.perform(get("/ryczalt-it")).andExpect(status().isOk()).andReturn();
    String html = response.getResponse().getContentAsString();

    org.assertj.core.api.Assertions.assertThat(html)
        .contains("Ryczałt, VAT i ZUS — w jednym miejscu")
        .contains("Księgowość JDG na ryczałcie – PIT, VAT, ZUS i KSeF | Ryczałt IT")
        .contains("name=\"robots\" content=\"index,follow\"")
        .contains("rel=\"canonical\" href=\"https://ryczalt.example.test/ryczalt-it\"")
        .contains("application/ld+json")
        .contains("FAQPage")
        .contains("JDG")
        .contains("ryczałt 12%")
        .contains("KSeF jest opcjonalny")
        .contains("href=\"/login\"")
        .doesNotContain("server-only-token", "SPRING_SECURITY_CONTEXT", "profileId");
  }

  @Test
  void successfulLoginUsesBackendIdentityAndRedirectsToCurrentProfile() throws Exception {
    var profile = new BackendAuthClient.Profile(7, "Main", "OWNER");
    when(backend.login("person@example.test", "secret"))
        .thenReturn(new BackendAuthClient.LoginResponse("server-only-token", null, "Bearer", 900));
    when(backend.me("server-only-token"))
        .thenReturn(
            new BackendAuthClient.CurrentProfileResponse(
                "person@example.test", profile, List.of(profile)));

    var result =
        mvc.perform(
                post("/login")
                    .with(csrf())
                    .param("username", "person@example.test")
                    .param("password", "secret"))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrl("/accounting"))
            .andReturn();

    var session = result.getRequest().getSession(false);
    org.assertj.core.api.Assertions.assertThat(session).isNotNull();
    var securityContext =
        (org.springframework.security.core.context.SecurityContext)
            session.getAttribute("SPRING_SECURITY_CONTEXT");
    org.assertj.core.api.Assertions.assertThat(securityContext.getAuthentication().getPrincipal())
        .isInstanceOf(AuthenticatedRyczaltSession.class);
    org.assertj.core.api.Assertions.assertThat(
            securityContext.getAuthentication().getPrincipal().toString())
        .doesNotContain("server-only-token");
    mvc.perform(get("/accounting").session((org.springframework.mock.web.MockHttpSession) session))
        .andExpect(status().is3xxRedirection())
        .andExpect(redirectedUrl("/profiles/7/accounting"));
  }

  @Test
  void failedLoginIsSafeAndUnauthorizedProfileDoesNotSwitchCurrentProfile() throws Exception {
    when(backend.login(anyString(), anyString()))
        .thenThrow(new BackendAuthException(BackendAuthException.Kind.UNAUTHENTICATED));
    mvc.perform(post("/login").with(csrf()).param("username", "person").param("password", "wrong"))
        .andExpect(status().is3xxRedirection())
        .andExpect(redirectedUrl("/login?error"));

    doReturn(new BackendAuthClient.LoginResponse("server-only-token", null, "Bearer", 900))
        .when(backend)
        .login("person", "secret");
    var allowed = new BackendAuthClient.Profile(7, "Main", "OWNER");
    when(backend.me("server-only-token"))
        .thenReturn(
            new BackendAuthClient.CurrentProfileResponse("person", allowed, List.of(allowed)));
    var login =
        mvc.perform(
                post("/login").with(csrf()).param("username", "person").param("password", "secret"))
            .andReturn();
    var session =
        (org.springframework.mock.web.MockHttpSession) login.getRequest().getSession(false);
    mvc.perform(get("/profiles/99/accounting").session(session)).andExpect(status().isForbidden());
    org.assertj.core.api.Assertions.assertThat(session.isInvalid()).isFalse();
    var context =
        (org.springframework.security.core.context.SecurityContext)
            session.getAttribute("SPRING_SECURITY_CONTEXT");
    org.assertj.core.api.Assertions.assertThat(
            ((AuthenticatedRyczaltSession) context.getAuthentication().getPrincipal())
                .currentProfileId())
        .isEqualTo(7);
  }
}
