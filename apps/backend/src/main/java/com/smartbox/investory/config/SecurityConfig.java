package com.smartbox.investory.config;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
  @Bean
  TokenAuthenticationService tokenAuthenticationService(
      @Value("${app.security.token-secret:change-me-ryczalt-token-secret-please-change}") String secret,
      @Value("${app.security.token-lifetime:PT12H}") java.time.Duration lifetime) {
    return new TokenAuthenticationService(secret, lifetime);
  }

  @Bean
  AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
      throws Exception {
    return configuration.getAuthenticationManager();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  UserDetailsService userDetailsService(JdbcTemplate jdbc) {
    return username -> {
      try {
        return jdbc.queryForObject(
            "SELECT username, password_hash, role, active FROM ryczalt.app_users WHERE lower(username) = lower(?)",
            (rs, row) -> {
              if (!rs.getBoolean("active") || rs.getString("password_hash") == null)
                throw new org.springframework.security.core.userdetails.UsernameNotFoundException(username);
              String role = rs.getString("role");
              return User.withUsername(rs.getString("username"))
                  .password(rs.getString("password_hash"))
                  .roles(role == null || role.isBlank() ? "USER" : role)
                  .build();
            },
            username);
      } catch (org.springframework.dao.EmptyResultDataAccessException e) {
        throw new org.springframework.security.core.userdetails.UsernameNotFoundException(username);
      }
    };
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(
      @Value("${app.security.mobile-api-allowed-origins:http://localhost:8081}") String origins) {
    var configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(
        Arrays.stream(origins.split(",")).map(String::trim).filter(v -> !v.isBlank()).toList());
    configuration.setAllowedMethods(java.util.List.of("GET","POST","PUT","DELETE","OPTIONS"));
    configuration.setAllowedHeaders(java.util.List.of("Authorization","Content-Type"));
    configuration.setAllowCredentials(true);
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", configuration);
    return source;
  }

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http, TokenAuthenticationService tokens, UserDetailsService users) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .cors(Customizer.withDefaults())
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(
                "/actuator/health", "/actuator/health/**", "/swagger-ui.html", "/swagger-ui/**",
                "/v3/api-docs/**", "/api/v1/auth/login", "/api/v1/auth/invitations/*/accept")
            .permitAll()
            .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .anyRequest().authenticated())
        .httpBasic(Customizer.withDefaults())
        .formLogin(form -> form.disable())
        .addFilterBefore(new BearerTokenAuthenticationFilter(tokens, users), BasicAuthenticationFilter.class);
    return http.build();
  }
}
