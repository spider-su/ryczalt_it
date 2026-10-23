package com.smartbox.investory.ryczalt.web;

import com.smartbox.investory.config.AuthorizationService;
import com.smartbox.investory.ryczalt.application.RyczaltRevenueForecastService;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Previous-year revenue (from history, or declared when history is missing) and health forecast. */
@RestController
@RequestMapping("/api/profiles/{profileId}/accounting/revenue-forecast/{year}")
public class RyczaltRevenueForecastRestController {
  private final RyczaltRevenueForecastService forecasts;
  private final AuthorizationService authorization;

  public RyczaltRevenueForecastRestController(
      RyczaltRevenueForecastService forecasts, AuthorizationService authorization) {
    this.forecasts = forecasts;
    this.authorization = authorization;
  }

  @GetMapping
  public RyczaltRevenueForecastService.RevenueForecast forecast(
      @PathVariable long profileId, @PathVariable int year, Authentication authentication) {
    if (!authorization.canRead(profileId, authentication))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    return forecasts.forecast(profileId, year);
  }

  @PutMapping
  public ResponseEntity<Void> declare(
      @PathVariable long profileId,
      @PathVariable int year,
      @RequestBody DeclarationRequest request,
      Authentication authentication) {
    if (!authorization.canWrite(profileId, authentication))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    forecasts.declarePriorYearRevenue(profileId, year, request.priorYearRevenue());
    return ResponseEntity.noContent().build();
  }

  public record DeclarationRequest(BigDecimal priorYearRevenue) {}
}
