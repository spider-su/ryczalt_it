package com.smartbox.investory.ryczalt.web;

import com.smartbox.investory.config.AuthorizationService;
import com.smartbox.investory.ryczalt.application.RyczaltMobileReadinessService;
import java.time.YearMonth;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/profiles/{profileId}")
public class RyczaltMobileReadinessRestController {
  private final RyczaltMobileReadinessService readiness;
  private final AuthorizationService authorization;

  public RyczaltMobileReadinessRestController(
      RyczaltMobileReadinessService readiness, AuthorizationService authorization) {
    this.readiness = readiness;
    this.authorization = authorization;
  }

  @GetMapping("/accounting/readiness")
  public RyczaltMobileReadinessService.Readiness getReadiness(
      @PathVariable long profileId,
      @RequestParam YearMonth month,
      Authentication authentication) {
    if (!authorization.canRead(profileId, authentication))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    try {
      return readiness.readiness(profileId, month);
    } catch (IllegalArgumentException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
    }
  }

  @PostMapping("/accounting/periods/{month}/activity-confirmation")
  public RyczaltMobileReadinessService.Confirmation confirmActivity(
      @PathVariable long profileId,
      @PathVariable YearMonth month,
      @RequestBody(required = false) ActivityConfirmationRequest request,
      Authentication authentication) {
    if (!authorization.canWrite(profileId, authentication))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    if (request == null || !"NO_REVENUE".equals(request.type()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "Only explicit NO_REVENUE confirmation is supported");
    try {
      return readiness.confirmNoRevenue(profileId, month, authentication.getName());
    } catch (IllegalArgumentException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
    } catch (IllegalStateException exception) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, exception.getMessage(), exception);
    }
  }

  public record ActivityConfirmationRequest(String type) {}
}
