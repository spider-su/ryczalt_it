package com.smartbox.investory.ui.auth;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(CustomerWebSecurityConfiguration.BackendProperties.class)
public class CustomerWebSecurityConfiguration implements WebMvcConfigurer {
  private final ProfileBindingInterceptor profileBinding;

  public CustomerWebSecurityConfiguration(ProfileBindingInterceptor profileBinding) {
    this.profileBinding = profileBinding;
  }

  @Bean
  Clock customerWebClock() {
    return Clock.systemUTC();
  }

  @Bean
  RestClient customerWebBackendRestClient(BackendProperties properties) {
    HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    var requestFactory = new JdkClientHttpRequestFactory(httpClient);
    requestFactory.setReadTimeout(Duration.ofSeconds(8));
    RestClient client =
        RestClient.builder().baseUrl(properties.baseUrl()).requestFactory(requestFactory).build();
    return client;
  }

  @Bean
  BackendAuthClient backendAuthClient(RestClient customerWebBackendRestClient) {
    return new RestBackendAuthClient(customerWebBackendRestClient);
  }

  @Bean
  SecurityFilterChain customerWebSecurity(
      HttpSecurity http, BackendAuthenticationProvider authenticationProvider) throws Exception {
    var successHandler = new SavedRequestAwareAuthenticationSuccessHandler();
    successHandler.setDefaultTargetUrl("/accounting");
    successHandler.setAlwaysUseDefaultTargetUrl(true);
    http.authenticationProvider(authenticationProvider)
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(
                        "/",
                        "/login",
                        "/ryczalt-najem",
                        "/ryczalt-it",
                        "/css/**",
                        "/js/**",
                        "/favicon.svg",
                        "/actuator/health")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .formLogin(
            form ->
                form.loginPage("/login")
                    .loginProcessingUrl("/login")
                    .usernameParameter("username")
                    .passwordParameter("password")
                    .successHandler(successHandler)
                    .failureUrl("/login?error"))
        .logout(
            logout ->
                logout
                    .logoutUrl("/logout")
                    .logoutSuccessUrl("/login?logout")
                    .invalidateHttpSession(true)
                    .clearAuthentication(true)
                    .deleteCookies("JSESSIONID"))
        .sessionManagement(
            session -> session.sessionFixation(fixation -> fixation.migrateSession()));
    return http.build();
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(profileBinding).addPathPatterns("/profiles/**");
  }

  @ConfigurationProperties("ryczalt.backend")
  public record BackendProperties(String baseUrl) {
    public BackendProperties {
      if (baseUrl == null || baseUrl.isBlank())
        throw new IllegalStateException("RYCZALT_BACKEND_URL must be configured");
      if (!baseUrl.matches("^https?://[^/]+(?::[0-9]+)?(?:/.*)?$"))
        throw new IllegalStateException("RYCZALT_BACKEND_URL must be an absolute HTTP(S) URL");
      baseUrl = baseUrl.replaceAll("/+$", "");
    }
  }
}
