package com.smartbox.investory.ui.auth;

import java.time.Instant;
import java.util.List;

/** Server-side authenticated identity and profile grants returned by backend /auth/me. */
public final class AuthenticatedRyczaltSession {
  private final String username;
  private final String bearerToken;
  private final Instant tokenExpiresAt;
  private final BackendAuthClient.CurrentProfileResponse identity;
  private volatile long currentProfileId;

  public AuthenticatedRyczaltSession(
      String username,
      String bearerToken,
      Instant tokenExpiresAt,
      BackendAuthClient.CurrentProfileResponse identity) {
    this.username = username;
    this.bearerToken = bearerToken;
    this.tokenExpiresAt = tokenExpiresAt;
    this.identity = identity;
    this.currentProfileId = identity.currentProfile().id();
  }

  public String username() { return username; }
  public String bearerToken() { return bearerToken; }
  public Instant tokenExpiresAt() { return tokenExpiresAt; }
  public BackendAuthClient.CurrentProfileResponse identity() { return identity; }
  public List<BackendAuthClient.Profile> accessibleProfiles() { return identity.accessibleProfiles(); }
  public long currentProfileId() { return currentProfileId; }
  public void selectProfile(long profileId) { this.currentProfileId = profileId; }
}
