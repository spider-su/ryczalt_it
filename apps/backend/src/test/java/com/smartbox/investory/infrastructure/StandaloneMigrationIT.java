package com.smartbox.investory.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class StandaloneMigrationIT {
  @Test
  void emptyDatabaseMigratesToStandaloneRyczaltSchema() throws Exception {
    try (var database = MigrationTestDatabase.open("standalone-ryczalt")) {
      MigrationTestDatabase.migrate(database);
      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        assertTrue(MigrationTestDatabase.exists(
            statement, "SELECT 1 FROM information_schema.tables WHERE table_schema='ryczalt' AND table_name='app_users'"));
        assertTrue(MigrationTestDatabase.exists(
            statement, "SELECT 1 FROM information_schema.tables WHERE table_schema='ryczalt' AND table_name='portfolios'"));
        assertTrue(MigrationTestDatabase.exists(
            statement, "SELECT 1 FROM information_schema.tables WHERE table_schema='ryczalt' AND table_name='ryczalt_invoice'"));
        assertTrue(MigrationTestDatabase.exists(
            statement, "SELECT 1 FROM information_schema.tables WHERE table_schema='ryczalt' AND table_name='integration_instances'"));
        assertEquals(0, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.app_users"));
      }
    }
  }

  @Test
  void releasedCoreSchemaUpgradesToTheLatestSchema() throws Exception {
    try (var database = MigrationTestDatabase.open("standalone-upgrade")) {
      MigrationTestDatabase.migrateTo(database, "01.000");
      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        assertTrue(MigrationTestDatabase.exists(
            statement, "SELECT 1 FROM information_schema.tables WHERE table_schema='ryczalt' AND table_name='app_users'"));
      }
      MigrationTestDatabase.migrate(database);
      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        assertTrue(MigrationTestDatabase.exists(
            statement, "SELECT 1 FROM information_schema.tables WHERE table_schema='ryczalt' AND table_name='ryczalt_invoice'"));
      }
    }
  }
}
