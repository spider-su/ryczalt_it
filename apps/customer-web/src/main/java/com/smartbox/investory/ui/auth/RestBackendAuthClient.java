package com.smartbox.investory.ui.auth;

import java.net.SocketTimeoutException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

final class RestBackendAuthClient implements BackendAuthClient {
  private final RestClient client;

  RestBackendAuthClient(RestClient client) {
    this.client = client;
  }

  @Override
  public LoginResponse login(String username, String password) {
    return execute(
        () ->
            client.post().uri("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .body(new LoginRequest(username, password)).retrieve().body(LoginResponse.class));
  }

  @Override
  public CurrentProfileResponse me(String bearerToken) {
    return execute(
        () ->
            client.get().uri("/api/v1/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                .retrieve().body(CurrentProfileResponse.class));
  }

  private <T> T execute(java.util.function.Supplier<T> request) {
    try {
      T response = request.get();
      if (response == null) throw new BackendAuthException(BackendAuthException.Kind.UNEXPECTED);
      if (response instanceof LoginResponse login) login.bearerToken();
      return response;
    } catch (BackendAuthException exception) {
      throw exception;
    } catch (RestClientResponseException exception) {
      throw new BackendAuthException(kind(exception.getStatusCode().value()));
    } catch (ResourceAccessException exception) {
      throw new BackendAuthException(
          containsTimeout(exception) ? BackendAuthException.Kind.TIMEOUT : BackendAuthException.Kind.UNAVAILABLE);
    } catch (org.springframework.web.client.RestClientException exception) {
      throw new BackendAuthException(BackendAuthException.Kind.UNEXPECTED);
    }
  }

  private static BackendAuthException.Kind kind(int status) {
    return switch (status) {
      case 401 -> BackendAuthException.Kind.UNAUTHENTICATED;
      case 403 -> BackendAuthException.Kind.FORBIDDEN;
      case 404 -> BackendAuthException.Kind.NOT_FOUND;
      case 400, 422 -> BackendAuthException.Kind.VALIDATION;
      case 409 -> BackendAuthException.Kind.CONFLICT;
      case 408, 504 -> BackendAuthException.Kind.TIMEOUT;
      case 502, 503 -> BackendAuthException.Kind.UNAVAILABLE;
      default -> BackendAuthException.Kind.UNEXPECTED;
    };
  }

  private static boolean containsTimeout(Throwable exception) {
    for (Throwable cause = exception; cause != null; cause = cause.getCause())
      if (cause instanceof SocketTimeoutException || cause instanceof java.net.http.HttpTimeoutException)
        return true;
    return false;
  }

  private record LoginRequest(String username, String password) {}
}
