package com.smartbox.investory.ui.auth;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.HttpServletResponse;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.ModelAndView;

class BackendSessionExceptionHandlerTest {
  static Stream<Arguments> mappings() {
    return Stream.of(
        Arguments.of(BackendAuthException.Kind.UNAUTHENTICATED, HttpServletResponse.SC_FOUND, "redirect:/login?expired"),
        Arguments.of(BackendAuthException.Kind.FORBIDDEN, HttpServletResponse.SC_FORBIDDEN, "error/403"),
        Arguments.of(BackendAuthException.Kind.NOT_FOUND, HttpServletResponse.SC_NOT_FOUND, "error/404"),
        Arguments.of(BackendAuthException.Kind.VALIDATION, HttpServletResponse.SC_BAD_REQUEST, "error/400"),
        Arguments.of(BackendAuthException.Kind.CONFLICT, HttpServletResponse.SC_CONFLICT, "error/409"),
        Arguments.of(BackendAuthException.Kind.UNAVAILABLE, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "error/backend-unavailable"),
        Arguments.of(BackendAuthException.Kind.TIMEOUT, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "error/backend-unavailable"),
        Arguments.of(BackendAuthException.Kind.UNEXPECTED, HttpServletResponse.SC_BAD_GATEWAY, "error/backend-error"));
  }

  @ParameterizedTest
  @MethodSource("mappings")
  void mapsBackendFailuresWithoutLeakingDetailsOrInvalidatingTheWrongSession(
      BackendAuthException.Kind kind, int status, String view) {
    var handler = new BackendSessionExceptionHandler();
    var request = new MockHttpServletRequest();
    var session = new MockHttpSession();
    request.setSession(session);
    var response = new MockHttpServletResponse();
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken("customer", "not-a-real-password"));
    var exception = new BackendAuthException(kind, new IllegalStateException("private backend response body"));

    try {
      ModelAndView result = handler.handle(exception, request, response);

      assertThat(response.getStatus()).isEqualTo(status);
      assertThat(result.getViewName()).isEqualTo(view);
      assertThat(session.isInvalid()).isEqualTo(kind == BackendAuthException.Kind.UNAUTHENTICATED);
      assertThat(result.getModel().toString()).doesNotContain("private backend response body");
      assertThat(SecurityContextHolder.getContext().getAuthentication() == null)
          .isEqualTo(kind == BackendAuthException.Kind.UNAUTHENTICATED);
    } finally {
      SecurityContextHolder.clearContext();
    }
  }
}
