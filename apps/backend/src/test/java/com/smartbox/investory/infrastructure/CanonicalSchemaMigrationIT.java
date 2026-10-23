package com.smartbox.investory.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class CanonicalSchemaMigrationIT {
  private static final Pattern FORBIDDEN_OPERATION =
      Pattern.compile("(?im)^\\s*(ALTER|UPDATE|DROP|DELETE)\\b");

  @Test
  void activeChainIsTwoCreateInsertMigrations() throws Exception {
    Path directory = Path.of("src", "main", "resources", "sql", "migration");
    try (var files = Files.list(directory)) {
      var migrations = files
          .filter(path -> path.getFileName().toString().matches("^V\\d+\\.\\d+__.*\\.sql$"))
          .sorted()
          .toList();
      assertEquals(2, migrations.size());
      assertEquals("V01.000__platform_schema.sql", migrations.get(0).getFileName().toString());
      assertEquals("V01.001__accounting_schema.sql", migrations.get(1).getFileName().toString());
      for (Path migration : migrations) {
        assertFalse(FORBIDDEN_OPERATION.matcher(Files.readString(migration)).find(),
            migration.getFileName() + " must not contain ALTER, UPDATE, DROP or DELETE statements");
      }
    }
  }

  @Test
  void freshSchemaContainsFinalShapeWithoutLegacyColumns() throws Exception {
    try (var database = MigrationTestDatabase.open("canonical-schema")) {
      MigrationTestDatabase.migrate(database);
      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        assertEquals(2, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.flyway_schema_history WHERE success AND type='SQL'"));
        assertTrue(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='ryczalt' AND table_name='ryczalt_period'
              AND column_name='activity_confirmation_type'
            """));
        assertTrue(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='ryczalt' AND table_name='ryczalt_invoice'
              AND column_name='booked_vat_pln'
            """));
        assertTrue(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='ryczalt' AND table_name='ryczalt_native_month_input'
              AND column_name='opening_vat_carry_forward'
            """));
        assertFalse(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='ryczalt' AND table_name='app_users' AND column_name='birth_date'
            """));
        assertFalse(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='ryczalt' AND table_name='portfolios'
              AND column_name LIKE 'taxpayer_%'
            """));
        assertTrue(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM pg_indexes
            WHERE schemaname='ryczalt' AND indexname='uq_ryczalt_native_month_accounting_start'
            """));
        assertTrue(MigrationTestDatabase.exists(statement, """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='ryczalt' AND table_name='ryczalt_profile'
              AND column_name='auto_approve_known_counterparties'
            """));
        assertEquals(0, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.app_users"));
        assertEquals(0, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.integration_jobs"));
        assertEquals(6, MigrationTestDatabase.singleInt(statement, """
            SELECT count(*) FROM ryczalt.ryczalt_tax_rule_set
            WHERE effective_from IN (DATE '2025-01-01', DATE '2026-01-01')
            """));
      }
    }
  }
}
