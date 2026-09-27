package com.smartbox.investory.ui.auth;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class CustomerWebEntryController {
  private final CurrentWebProfileResolver profiles;

  public CustomerWebEntryController(CurrentWebProfileResolver profiles) {
    this.profiles = profiles;
  }

  @GetMapping("/")
  public String home(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedRyczaltSession))
      return "redirect:/login";
    return "redirect:/accounting";
  }

  @GetMapping("/accounting")
  public String accounting(Authentication authentication) {
    BackendAuthClient.Profile profile = profiles.current(authentication);
    return "redirect:/profiles/" + profile.id() + "/accounting";
  }

  @GetMapping("/login")
  public String login(
      @RequestParam(required = false) String error,
      @RequestParam(required = false) String expired,
      @RequestParam(required = false) String logout,
      org.springframework.ui.Model model) {
    model.addAttribute("loginError", error != null);
    model.addAttribute("sessionExpired", expired != null);
    model.addAttribute("loggedOut", logout != null);
    return "login";
  }
}
