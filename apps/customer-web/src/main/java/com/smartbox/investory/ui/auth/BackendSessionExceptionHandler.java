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
    if (exception.kind() == BackendAuthException.Kind.UNAUTHENTICATED) {
      var session = request.getSession(false);
      if (session != null) session.invalidate();
      SecurityContextHolder.clearContext();
      return new ModelAndView("redirect:/login?expired");
    }
    if (exception.kind() == BackendAuthException.Kind.FORBIDDEN) {
      response.setStatus(HttpServletResponse.SC_FORBIDDEN);
      return new ModelAndView("error/403");
    }
    response.setStatus(
        exception.kind() == BackendAuthException.Kind.UNAVAILABLE
                || exception.kind() == BackendAuthException.Kind.TIMEOUT
            ? HttpServletResponse.SC_SERVICE_UNAVAILABLE
            : HttpServletResponse.SC_BAD_GATEWAY);
    return new ModelAndView("error/backend-unavailable");
  }
}
