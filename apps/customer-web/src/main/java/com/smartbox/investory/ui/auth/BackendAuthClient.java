package com.smartbox.investory.ui.auth;

import java.util.List;

public interface BackendAuthClient {
  LoginResponse login(String username, String password);

  CurrentProfileResponse me(String bearerToken);

  record LoginResponse(String token, String accessToken, String tokenType, long expiresIn) {
    public String bearerToken() {
      String value = token == null || token.isBlank() ? accessToken : token;
      if (value == null
          || value.isBlank()
          || tokenType == null
          || !tokenType.equalsIgnoreCase("Bearer")
          || expiresIn <= 0) throw new BackendAuthException(BackendAuthException.Kind.UNEXPECTED);
      return value;
    }
  }

  record CurrentProfileResponse(String username, Profile currentProfile, List<Profile> accessibleProfiles) {
    public CurrentProfileResponse {
      accessibleProfiles = accessibleProfiles == null ? List.of() : List.copyOf(accessibleProfiles);
      if (username == null || username.isBlank() || currentProfile == null || currentProfile.id() <= 0 || accessibleProfiles.isEmpty())
        throw new BackendAuthException(BackendAuthException.Kind.UNEXPECTED);
      if (accessibleProfiles.stream().anyMatch(profile -> profile == null || profile.id() <= 0 || profile.role() == null || profile.role().isBlank()))
        throw new BackendAuthException(BackendAuthException.Kind.UNEXPECTED);
      if (accessibleProfiles.stream().noneMatch(profile -> profile.id() == currentProfile.id()))
        throw new BackendAuthException(BackendAuthException.Kind.UNEXPECTED);
    }
  }

  record Profile(long id, String name, String role) {}
}
