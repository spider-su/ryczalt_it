package com.smartbox.investory.ui.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import java.time.Instant;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

@Component
public final class ProfileBindingInterceptor implements HandlerInterceptor {
  public static final String PROFILE_ATTRIBUTE = ProfileBindingInterceptor.class.getName() + ".profile";
  private final CurrentWebProfileResolver profiles;

  public ProfileBindingInterceptor(CurrentWebProfileResolver profiles) {
    this.profiles = profiles;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
      throws java.io.IOException {
    Object variablesObject = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
    if (!(variablesObject instanceof Map<?, ?> variables) || !variables.containsKey("profileId"))
      return true;
    long requestedProfileId;
    try {
      requestedProfileId = Long.parseLong(String.valueOf(variables.get("profileId")));
    } catch (NumberFormatException exception) {
      throw new org.springframework.security.access.AccessDeniedException("Profile access denied");
    }
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication != null
        && authentication.getPrincipal() instanceof AuthenticatedRyczaltSession session
        && !session.tokenExpiresAt().isAfter(Instant.now())) {
      var httpSession = request.getSession(false);
      if (httpSession != null) httpSession.invalidate();
      SecurityContextHolder.clearContext();
      response.sendRedirect(request.getContextPath() + "/login?expired");
      return false;
    }
    BackendAuthClient.Profile profile = profiles.resolve(requestedProfileId, authentication);
    request.setAttribute(PROFILE_ATTRIBUTE, profile);
    String role = profile.role().trim().toUpperCase(java.util.Locale.ROOT);
    var authorities =
        role.equals("OWNER") || role.equals("PROFILE_OWNER")
            ? java.util.List.of(new SimpleGrantedAuthority("ROLE_PROFILE_OWNER"))
            : java.util.List.of(new SimpleGrantedAuthority("ROLE_PROFILE_USER"));
    SecurityContextHolder.getContext()
        .setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(
                authentication.getPrincipal(), null, authorities));
    return true;
  }
}
