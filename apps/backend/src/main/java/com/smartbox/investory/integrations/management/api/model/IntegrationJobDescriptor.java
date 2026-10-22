package com.smartbox.investory.integrations.management.api.model;

public record IntegrationJobDescriptor(
    String jobType, String label, String defaultCron, String defaultTimezone) {
  public static IntegrationJobDescriptor forType(String jobType) {
    return switch (jobType) {
      case "refresh-rates" ->
          new IntegrationJobDescriptor(
              jobType, "Refresh FX rates", "0 0 23 L * *", "Europe/Warsaw");
      case "sync-invoices" ->
          new IntegrationJobDescriptor(
              jobType, "Sync KSeF invoices", "0 0 2 * * *", "Europe/Warsaw");
      default -> new IntegrationJobDescriptor(jobType, jobType, "0 0 * * * *", "Europe/Warsaw");
    };
  }
}
