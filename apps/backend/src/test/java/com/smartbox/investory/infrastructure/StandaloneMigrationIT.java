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

        statement.executeUpdate(
            "INSERT INTO ryczalt.app_users (username, display_name) VALUES ('migration-test', 'Migration Test')");
        long userId = MigrationTestDatabase.singleInt(statement,
            "SELECT id FROM ryczalt.app_users WHERE username='migration-test'");
        statement.executeUpdate(
            "INSERT INTO ryczalt.portfolios (name, user_id) VALUES ('Migration Profile', " + userId + ")");
        long profileId = MigrationTestDatabase.singleInt(statement,
            "SELECT id FROM ryczalt.portfolios WHERE name='Migration Profile'");
        statement.executeUpdate(
            "INSERT INTO ryczalt.ryczalt_profile (profile_id) VALUES (" + profileId + ")");

        assertEquals(1, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.ryczalt_profile WHERE profile_id=" + profileId
                + " AND auto_approve_known_counterparties IS TRUE"));
        assertEquals(1, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM information_schema.table_constraints "
                + "WHERE constraint_schema='ryczalt' AND table_name='ryczalt_profile' "
                + "AND constraint_type='FOREIGN KEY'"));
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
