package com.smartbox.investory.ui.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
final class BackendAuthenticationProvider implements AuthenticationProvider {
  private final BackendAuthClient backend;
  private final Clock clock;

  BackendAuthenticationProvider(BackendAuthClient backend, Clock clock) {
    this.backend = backend;
    this.clock = clock;
  }

  @Override
  public Authentication authenticate(Authentication authentication) {
    try {
      String username = authentication.getName();
      String password = String.valueOf(authentication.getCredentials());
      BackendAuthClient.LoginResponse login = backend.login(username, password);
      String token = login.bearerToken();
      BackendAuthClient.CurrentProfileResponse identity = backend.me(token);
      var session = new AuthenticatedRyczaltSession(
          identity.username(), token, Instant.now(clock).plusSeconds(login.expiresIn()), identity);
      return UsernamePasswordAuthenticationToken.authenticated(session, null, List.of());
    } catch (BackendAuthException exception) {
      if (exception.kind() == BackendAuthException.Kind.UNAUTHENTICATED
          || exception.kind() == BackendAuthException.Kind.FORBIDDEN)
        throw new BadCredentialsException("Invalid username or password");
      throw new InternalAuthenticationServiceException("Authentication service is unavailable");
    }
  }

  @Override
  public boolean supports(Class<?> authentication) {
    return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
  }
}
