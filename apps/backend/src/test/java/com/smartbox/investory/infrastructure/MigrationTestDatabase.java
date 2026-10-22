package com.smartbox.investory.infrastructure;

import com.smartbox.investory.testsupport.SharedPostgres;
import com.smartbox.investory.testsupport.WorkerDatabase;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;

final class MigrationTestDatabase {

  private MigrationTestDatabase() {}

  static WorkerDatabase open(String scope) {
    return SharedPostgres.database(scope);
  }

  static void migrate(WorkerDatabase database) {
    assertDisposable(database);
    flyway(database).clean();
    flyway(database).migrate();
  }

  static void upgrade(WorkerDatabase database) {
    assertDisposable(database);
    flyway(database).migrate();
  }

  static void migrateTo(WorkerDatabase database, String target) {
    assertDisposable(database);
    flyway(database, target).migrate();
  }

  static Connection connection(WorkerDatabase database) throws SQLException {
    return DriverManager.getConnection(
        database.jdbcUrl(), database.username(), database.password());
  }

  static void executeMaintenanceScript(Connection connection, String resource) {
    ScriptUtils.executeSqlScript(connection, new ClassPathResource(resource));
  }

  static Flyway flyway(WorkerDatabase database) {
    return flyway(database, null);
  }

  private static Flyway flyway(WorkerDatabase database, String target) {
    var configuration =
        Flyway.configure()
            .cleanDisabled(false)
            .dataSource(database.jdbcUrl(), database.username(), database.password())
            .schemas("ryczalt")
            .defaultSchema("ryczalt")
            .createSchemas(true)
            .locations("classpath:sql/migration");
    if (target != null) configuration.target(target);
    return configuration.load();
  }

  static void assertDisposable(WorkerDatabase database) {
    String url = database.jdbcUrl();
    if (url == null
        || !url.matches("^jdbc:postgresql://.*/" + database.databaseName() + "(?:\\?.*)?$")) {
      throw new IllegalStateException(
          "Refusing to run migration test against non-disposable database: " + url);
    }
  }

  static int singleInt(Statement statement, String sql) throws SQLException {
    try (ResultSet result = statement.executeQuery(sql)) {
      if (!result.next()) {
        throw new SQLException("Expected one row for query: " + sql);
      }
      return result.getInt(1);
    }
  }

  static boolean exists(Statement statement, String sql) throws SQLException {
    try (ResultSet result = statement.executeQuery(sql)) {
      return result.next();
    }
  }

}
