package com.smartbox.investory.ui.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

class CurrentWebProfileResolverTest {
  private final CurrentWebProfileResolver resolver = new CurrentWebProfileResolver();
  private final BackendAuthClient.Profile first = new BackendAuthClient.Profile(7, "Main", "OWNER");
  private final BackendAuthClient.Profile second = new BackendAuthClient.Profile(9, "Second", "USER");

  @Test
  void permitsOnlyGrantedProfilesAndTracksSelectedProfile() {
    var identity = new BackendAuthClient.CurrentProfileResponse("person", first, List.of(first, second));
    var session = new AuthenticatedRyczaltSession("person", "secret", Instant.now().plusSeconds(60), identity);
    var authentication = UsernamePasswordAuthenticationToken.authenticated(session, null, List.of());

    assertThat(resolver.resolve(9, authentication)).isEqualTo(second);
    assertThat(session.currentProfileId()).isEqualTo(9);
    assertThat(resolver.current(authentication)).isEqualTo(second);
  }

  @Test
  void deniesUnknownProfilesAndMissingIdentity() {
    var identity = new BackendAuthClient.CurrentProfileResponse("person", first, List.of(first));
    var session = new AuthenticatedRyczaltSession("person", "secret", Instant.now().plusSeconds(60), identity);
    var authentication = UsernamePasswordAuthenticationToken.authenticated(session, null, List.of());

    assertThatThrownBy(() -> resolver.resolve(99, authentication))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    assertThatThrownBy(() -> resolver.resolve(7, null))
        .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
  }
}
