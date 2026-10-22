package com.smartbox.investory.ui.accounting;

import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

/** Explicit taxpayer facts; missing amounts are never inferred from calculated liabilities. */
@Controller
public class RyczaltAccountingInputController {
  static final List<Field> MONTHLY = List.of(
      new Field("socialContributionDeduction", "Social contributions actually paid (PLN)", true),
      new Field("healthContributionPaidOverride", "Health contributions actually paid (PLN)", true),
      new Field("fullJdgSocial", "Full JDG social contribution override (PLN, optional)", false),
      new Field("healthContributionOverride", "Health liability override (PLN, optional)", false),
      new Field("deductionsAlreadyConsumed", "Deductions already consumed (PLN)", true),
      new Field("salesCorrections", "Sales corrections (PLN, signed)", true),
      new Field("explicitVatAdjustments", "VAT adjustments (PLN, signed)", true));
  static final List<Field> OPENING = List.of(
      new Field("openingYtdRevenue", "Revenue before accounting start (PLN)", true),
      new Field("openingSocialContributionsPaid", "Social contributions paid before start (PLN)", true),
      new Field("openingHealthContributionsPaid", "Health contributions paid before start (PLN)", true),
      new Field("openingDeductionsConsumed", "Deductions consumed before start (PLN)", true),
      new Field("openingVatCarryForward", "VAT carried forward at start (PLN)", true));
  private final RyczaltWebAccountingClient client;

  public RyczaltAccountingInputController(RyczaltWebAccountingClient client) {
    this.client = client;
  }

  @GetMapping("/profiles/{profileId}/accounting/periods/{month}/input-settings")
  public String page(@PathVariable long profileId, @PathVariable YearMonth month,
      Model model, HttpServletRequest request) {
    var state = client.inputSettings(profileId, month);
    return page(profileId, month, state, state.settings() == null ? Map.of() : state.settings(), model, request);
  }

  @PostMapping("/profiles/{profileId}/accounting/periods/{month}/input-settings")
  public String save(@PathVariable long profileId, @PathVariable YearMonth month,
      @RequestParam Map<String, String> submitted, Model model, HttpServletRequest request,
      RedirectAttributes redirect) {
    if (!RyczaltAccountingWebSupport.canWrite(request)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    var state = client.inputSettings(profileId, month);
    Map<String, Object> values = new LinkedHashMap<>();
    if (state.settings() != null) values.putAll(state.settings());
    try {
      for (String name : List.of("jdgActive", "qualifyingUop", "voluntarySickness")) {
        String value = submitted.get(name);
        if (!"true".equals(value) && !"false".equals(value)) throw new IllegalArgumentException("Select " + name);
        values.put(name, Boolean.valueOf(value));
      }
      values.put("zusRegime", "JDG");
      for (Field field : MONTHLY) values.put(field.name(), amount(submitted, field));
      if (state.configuredStartDate() == null || YearMonth.from(state.configuredStartDate()).equals(month)) {
        String date = submitted.get("accountingStartDate");
        if (date == null || date.isBlank()) throw new IllegalArgumentException("Accounting start date is required.");
        values.put("accountingStartDate", LocalDate.parse(date).toString());
        for (Field field : OPENING) values.put(field.name(), amount(submitted, field));
      }
      client.saveInputSettings(profileId, month, values);
    } catch (IllegalArgumentException | java.time.DateTimeException exception) {
      model.addAttribute("accountingError", exception.getMessage());
      return page(profileId, month, state, submitted, model, request);
    } catch (ResponseStatusException exception) {
      if (exception.getStatusCode().value() != 400 && exception.getStatusCode().value() != 409) throw exception;
      model.addAttribute("accountingError", exception.getReason());
      return page(profileId, month, state, submitted, model, request);
    }
    redirect.addFlashAttribute("accountingMessage", "Accounting inputs saved. Recalculate affected months after completing missing facts.");
    return RyczaltAccountingWebSupport.accountingRedirect(profileId, month);
  }

  private static BigDecimal amount(Map<String, String> submitted, Field field) {
    String value = submitted.get(field.name());
    if (value == null || value.isBlank()) {
      if (field.required()) throw new IllegalArgumentException(field.label() + " is required; enter zero only when confirmed.");
      return null;
    }
    try {
      return new BigDecimal(value);
    } catch (NumberFormatException exception) {
      throw new IllegalArgumentException(field.label() + " must be a number.");
    }
  }

  private static String page(long profileId, YearMonth month, RyczaltWebAccountingClient.InputSettings state,
      Map<String, ?> values, Model model, HttpServletRequest request) {
    model.addAttribute("profileId", profileId);
    model.addAttribute("month", month);
    model.addAttribute("settings", values);
    model.addAttribute("configuredStartDate", state.configuredStartDate());
    model.addAttribute("missingFields", state.missingFields());
    model.addAttribute("monthlyFields", MONTHLY);
    model.addAttribute("openingFields", OPENING);
    model.addAttribute("showOpening", state.configuredStartDate() == null || YearMonth.from(state.configuredStartDate()).equals(month));
    model.addAttribute("canWrite", RyczaltAccountingWebSupport.canWrite(request) && month.getYear() == 2026);
    return "accounting/input-settings";
  }

  public record Field(String name, String label, boolean required) {}
}
