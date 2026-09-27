package com.smartbox.investory.ui.auth;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class CurrentWebProfileResolver {
  public BackendAuthClient.Profile resolve(long requestedProfileId, Authentication authentication) {
    if (authentication == null
        || !(authentication.getPrincipal() instanceof AuthenticatedRyczaltSession session))
      throw new AccessDeniedException("Authenticated profile context is unavailable");
    BackendAuthClient.Profile profile =
        session.accessibleProfiles().stream()
            .filter(item -> item.id() == requestedProfileId)
            .findFirst()
            .orElseThrow(() -> new AccessDeniedException("Profile access denied"));
    session.selectProfile(profile.id());
    return profile;
  }

  public BackendAuthClient.Profile current(Authentication authentication) {
    if (authentication == null
        || !(authentication.getPrincipal() instanceof AuthenticatedRyczaltSession session))
      throw new AccessDeniedException("Authenticated profile context is unavailable");
    return resolve(session.currentProfileId(), authentication);
  }
}
