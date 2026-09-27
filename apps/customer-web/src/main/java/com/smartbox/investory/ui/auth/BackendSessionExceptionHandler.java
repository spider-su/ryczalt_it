package com.smartbox.investory.ui.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.ModelAndView;

@ControllerAdvice(annotations = Controller.class)
public class BackendSessionExceptionHandler {
  @ExceptionHandler(BackendAuthException.class)
  public ModelAndView handle(
      BackendAuthException exception, HttpServletRequest request, HttpServletResponse response) {
    return switch (exception.kind()) {
      case UNAUTHENTICATED -> {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        response.setStatus(HttpServletResponse.SC_FOUND);
        yield new ModelAndView("redirect:/login?expired");
      }
      case FORBIDDEN -> error(response, HttpServletResponse.SC_FORBIDDEN, "error/403");
      case NOT_FOUND -> error(response, HttpServletResponse.SC_NOT_FOUND, "error/404");
      case VALIDATION -> error(response, HttpServletResponse.SC_BAD_REQUEST, "error/400");
      case CONFLICT -> error(response, HttpServletResponse.SC_CONFLICT, "error/409");
      case UNAVAILABLE, TIMEOUT ->
          error(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "error/backend-unavailable");
      case UNEXPECTED -> error(response, HttpServletResponse.SC_BAD_GATEWAY, "error/backend-error");
    };
  }

  private static ModelAndView error(HttpServletResponse response, int status, String view) {
    response.setStatus(status);
    return new ModelAndView(view);
  }
}
