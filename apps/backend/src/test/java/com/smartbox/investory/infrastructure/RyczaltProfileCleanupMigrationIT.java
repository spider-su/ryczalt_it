package com.smartbox.investory.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;

class RyczaltProfileCleanupMigrationIT {
  @Test
  void copiesLegacyProfileFactsBeforeDroppingDuplicateColumns() throws Exception {
    try (var database = MigrationTestDatabase.open("profile-cleanup-upgrade")) {
      MigrationTestDatabase.migrateTo(database, "01.026");
      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        statement.executeUpdate("""
            INSERT INTO ryczalt.app_users (username, email, display_name, birth_date)
            VALUES ('cleanup-one', 'one@example.test', 'Owner One', DATE '1980-01-02'),
                   ('cleanup-two', 'two@example.test', 'Owner Two', DATE '1981-02-03')
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.portfolios (
                name, user_id, owner, taxpayer_nip, taxpayer_full_name,
                taxpayer_first_name, taxpayer_surname, taxpayer_date_of_birth,
                taxpayer_tax_office_code, taxpayer_email, tax_micro_account,
                zus_payment_account
            )
            SELECT 'Profile One', id, 'Owner One', '1111111111', 'Company One',
                   'Owner', 'One', DATE '1980-01-02', '1234', 'one-tax@example.test',
                   'TAX-ACCOUNT-ONE', 'ZUS-ACCOUNT-ONE'
            FROM ryczalt.app_users WHERE username = 'cleanup-one'
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.portfolios (
                name, user_id, owner, taxpayer_nip, taxpayer_full_name,
                taxpayer_first_name, taxpayer_surname, taxpayer_date_of_birth,
                taxpayer_tax_office_code, taxpayer_email, tax_micro_account,
                zus_payment_account
            )
            SELECT 'Profile Two', id, 'Owner Two', '2222222222', 'Company Two',
                   'Owner', 'Two', DATE '1981-02-03', '5678', 'two-tax@example.test',
                   'TAX-ACCOUNT-TWO', 'ZUS-ACCOUNT-TWO'
            FROM ryczalt.app_users WHERE username = 'cleanup-two'
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_profile (
                profile_id, nip, full_name, tax_office_code, email,
                vat_payment_account, ryczalt_payment_account, zus_payment_account,
                first_name, surname, date_of_birth
            )
            SELECT p.id, p.taxpayer_nip, p.taxpayer_full_name,
                   p.taxpayer_tax_office_code, p.taxpayer_email,
                   p.tax_micro_account, p.tax_micro_account, p.zus_payment_account,
                   p.taxpayer_first_name, p.taxpayer_surname, p.taxpayer_date_of_birth
            FROM ryczalt.portfolios p WHERE p.name = 'Profile One'
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_period (profile_id, period_year, period_month, status)
            SELECT id, 2026, 1, 'CALCULATED' FROM ryczalt.portfolios WHERE name = 'Profile One'
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_invoice (
                period_id, profile_id, direction, reference, issue_date, accounting_date,
                net_amount, vat_amount, gross_amount, currency
            )
            SELECT period.id, period.profile_id, 'INCOME', 'fixture-invoice',
                   DATE '2026-01-10', DATE '2026-01-10', 100, 23, 123, 'PLN'
            FROM ryczalt.ryczalt_period period
            JOIN ryczalt.portfolios p ON p.id = period.profile_id
            WHERE p.name = 'Profile One'
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_source_reference (
                profile_id, entity_type, entity_id, source, external_id
            )
            SELECT invoice.profile_id, 'INVOICE', invoice.id, 'TEST', 'fixture-invoice'
            FROM ryczalt.ryczalt_invoice invoice
            WHERE invoice.reference = 'fixture-invoice'
            """);
      }

      MigrationTestDatabase.upgrade(database);

      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        assertEquals(2, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.ryczalt_profile"));
        assertEquals(1, MigrationTestDatabase.singleInt(statement, """
            SELECT count(*) FROM ryczalt.ryczalt_profile r
            JOIN ryczalt.portfolios p ON p.id = r.profile_id
            WHERE p.name = 'Profile Two' AND r.nip = '2222222222'
              AND r.full_name = 'Company Two' AND r.date_of_birth = DATE '1981-02-03'
              AND r.vat_payment_account = 'TAX-ACCOUNT-TWO'
              AND r.ryczalt_payment_account = 'TAX-ACCOUNT-TWO'
              AND r.zus_payment_account = 'ZUS-ACCOUNT-TWO'
            """));
        assertTrue(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'ryczalt' AND table_name = 'portfolios' AND column_name = 'owner'
            """));
        assertFalse(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'ryczalt' AND table_name = 'app_users' AND column_name = 'birth_date'
            """));
        assertEquals(0, MigrationTestDatabase.singleInt(statement, """
            SELECT count(*) FROM information_schema.columns
            WHERE table_schema = 'ryczalt' AND table_name = 'portfolios'
              AND column_name IN ('taxpayer_nip', 'taxpayer_full_name', 'taxpayer_first_name',
                  'taxpayer_surname', 'taxpayer_date_of_birth', 'taxpayer_tax_office_code',
                  'taxpayer_email', 'tax_micro_account', 'zus_payment_account')
            """));
        assertEquals(1, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.ryczalt_invoice WHERE reference='fixture-invoice'"));
        assertEquals(1, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.ryczalt_source_reference WHERE external_id='fixture-invoice'"));
        assertFalse(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'ryczalt'
              AND indexname IN ('ix_ryczalt_obligation_period', 'ix_ryczalt_payment_account_rule_profile')
            """));
        assertTrue(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'ryczalt' AND indexname = 'uq_ryczalt_obligation_period_type'
            """));
      }
    }
  }

  @Test
  void stopsWithoutDroppingDataWhenCanonicalProfileConflicts() throws Exception {
    try (var database = MigrationTestDatabase.open("profile-cleanup-conflict")) {
      MigrationTestDatabase.migrateTo(database, "01.026");
      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        statement.executeUpdate("""
            INSERT INTO ryczalt.app_users (username, display_name, birth_date)
            VALUES ('cleanup-conflict', 'Cleanup Conflict', DATE '1980-01-02')
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.portfolios (
                name, user_id, taxpayer_nip, taxpayer_full_name, taxpayer_date_of_birth
            )
            SELECT 'Conflict Profile', id, '1111111111', 'Legacy Company', DATE '1980-01-02'
            FROM ryczalt.app_users WHERE username = 'cleanup-conflict'
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_profile (profile_id, nip, full_name)
            SELECT id, '1111111111', 'Different Canonical Company'
            FROM ryczalt.portfolios WHERE name = 'Conflict Profile'
            """);
      }

      assertThrows(FlywayException.class, () -> MigrationTestDatabase.upgrade(database));

      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        assertTrue(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'ryczalt' AND table_name = 'app_users' AND column_name = 'birth_date'
            """));
        assertTrue(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'ryczalt' AND table_name = 'portfolios' AND column_name = 'taxpayer_nip'
            """));
        assertEquals(1, MigrationTestDatabase.singleInt(statement, """
            SELECT count(*) FROM ryczalt.ryczalt_profile WHERE full_name = 'Different Canonical Company'
            """));
        assertEquals(0, MigrationTestDatabase.singleInt(statement, """
            SELECT count(*) FROM ryczalt.flyway_schema_history
            WHERE version = '01.027' AND success
            """));
      }
    }
  }
}
