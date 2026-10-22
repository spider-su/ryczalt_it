package com.smartbox.investory.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class OverpaidObligationStatusMaintenanceIT {
  @Test
  void explicitMaintenanceScriptMarksOverallocatedPaidObligationOverpaid() throws Exception {
    try (var database = MigrationTestDatabase.open("overpaid-obligation-maintenance")) {
      MigrationTestDatabase.migrate(database);
      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        statement.executeUpdate("""
            INSERT INTO ryczalt.app_users (username, display_name)
            VALUES ('overpaid-test', 'Overpaid Test')
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.portfolios (name, user_id)
            SELECT 'Overpaid Profile', id FROM ryczalt.app_users WHERE username = 'overpaid-test'
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_period (profile_id, period_year, period_month, status)
            SELECT id, 2026, 1, 'CALCULATED'
            FROM ryczalt.portfolios WHERE name = 'Overpaid Profile'
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_obligation (
                period_id, profile_id, obligation_type, amount, currency, status
            )
            SELECT period.id, period.profile_id, 'ZUS', 100, 'PLN', 'PAID'
            FROM ryczalt.ryczalt_period period
            WHERE period.profile_id = (SELECT id FROM ryczalt.portfolios WHERE name = 'Overpaid Profile')
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_transaction (
                period_id, profile_id, booking_date, amount, currency
            )
            SELECT period.id, period.profile_id, DATE '2026-02-10', -120, 'PLN'
            FROM ryczalt.ryczalt_period period
            WHERE period.profile_id = (SELECT id FROM ryczalt.portfolios WHERE name = 'Overpaid Profile')
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_payment_match (
                profile_id, obligation_id, transaction_id, matched_amount, match_type
            )
            SELECT obligation.profile_id, obligation.id, transaction.id, 120, 'MANUAL'
            FROM ryczalt.ryczalt_obligation obligation
            JOIN ryczalt.ryczalt_transaction transaction
              ON transaction.profile_id = obligation.profile_id
             AND transaction.period_id = obligation.period_id
            WHERE obligation.profile_id = (SELECT id FROM ryczalt.portfolios WHERE name = 'Overpaid Profile')
            """);
        assertEquals(1, MigrationTestDatabase.singleInt(statement, """
            SELECT count(*) FROM ryczalt.ryczalt_obligation
            WHERE status = 'PAID' AND amount < (
                SELECT sum(payment_match.matched_amount)
                FROM ryczalt.ryczalt_payment_match payment_match
                WHERE payment_match.obligation_id = ryczalt_obligation.id
            )
            """));
      }
      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        MigrationTestDatabase.executeMaintenanceScript(
            connection, "sql/maintenance/reconcile_overpaid_obligation_status.sql");
        assertEquals(1, MigrationTestDatabase.singleInt(statement, """
            SELECT count(*) FROM ryczalt.ryczalt_obligation
            WHERE status = 'OVERPAID' AND amount = 100
            """));
        assertEquals(120, MigrationTestDatabase.singleInt(statement, """
            SELECT sum(payment_match.matched_amount)::int
            FROM ryczalt.ryczalt_payment_match payment_match
            JOIN ryczalt.ryczalt_obligation obligation
              ON obligation.profile_id = payment_match.profile_id
             AND obligation.id = payment_match.obligation_id
            WHERE obligation.status = 'OVERPAID'
            """));
      }
    }
  }
}
