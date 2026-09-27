package com.smartbox.investory.ui.auth;

/** Safe transport failure classification for the backend authentication boundary. */
public final class BackendAuthException extends RuntimeException {
  public enum Kind {
    UNAUTHENTICATED,
    FORBIDDEN,
    NOT_FOUND,
    VALIDATION,
    CONFLICT,
    UNAVAILABLE,
    TIMEOUT,
    UNEXPECTED
  }

  private final Kind kind;

  public BackendAuthException(Kind kind) {
    super("Backend authentication request failed: " + kind);
    this.kind = kind;
  }

  public BackendAuthException(Kind kind, Throwable cause) {
    super("Backend authentication request failed: " + kind, cause);
    this.kind = kind;
  }

  public Kind kind() {
    return kind;
  }
}
