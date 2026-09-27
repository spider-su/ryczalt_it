package com.smartbox.investory.ui.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class RestBackendAuthClientTest {
  @Test
  void loginUsesBackendContractAndMeUsesBearerToken() {
    RestClient.Builder builder = RestClient.builder().baseUrl("http://backend.test");
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    BackendAuthClient client = new RestBackendAuthClient(builder.build());
    server.expect(requestTo("http://backend.test/api/v1/auth/login"))
        .andExpect(method(HttpMethod.POST)).andExpect(jsonPath("$.username").value("person@example.test"))
        .andExpect(jsonPath("$.password").value("secret"))
        .andRespond(withSuccess("{\"token\":\"server-token\",\"tokenType\":\"Bearer\",\"expiresIn\":900}", MediaType.APPLICATION_JSON));
    server.expect(requestTo("http://backend.test/api/v1/auth/me"))
        .andExpect(method(HttpMethod.GET)).andExpect(header("Authorization", "Bearer server-token"))
        .andRespond(withSuccess("{\"username\":\"person@example.test\",\"currentProfile\":{\"id\":7,\"name\":\"Main\",\"role\":\"OWNER\"},\"accessibleProfiles\":[{\"id\":7,\"name\":\"Main\",\"role\":\"OWNER\"}]}", MediaType.APPLICATION_JSON));

    var login = client.login("person@example.test", "secret");
    assertThat(login.bearerToken()).isEqualTo("server-token");
    assertThat(client.me(login.bearerToken()).currentProfile().id()).isEqualTo(7);
    server.verify();
  }

  @Test
  void mapsBackendAuthenticationAndAvailabilityErrorsWithoutExposingBody() {
    RestClient.Builder builder = RestClient.builder().baseUrl("http://backend.test");
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    BackendAuthClient client = new RestBackendAuthClient(builder.build());
    server.expect(requestTo("http://backend.test/api/v1/auth/login"))
        .andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("private backend detail"));
    server.expect(requestTo("http://backend.test/api/v1/auth/me"))
        .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE).body("private backend detail"));
    assertThatThrownBy(() -> client.login("user", "wrong"))
        .isInstanceOf(BackendAuthException.class)
        .hasMessageNotContaining("private backend detail");
    assertThatThrownBy(() -> client.me("token"))
        .isInstanceOf(BackendAuthException.class)
        .hasMessageNotContaining("private backend detail");
    server.verify();
  }
}
