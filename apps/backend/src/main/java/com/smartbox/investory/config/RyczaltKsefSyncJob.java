package com.smartbox.investory.config;

import com.smartbox.investory.integrations.ksef.KsefSyncJobPort;
import com.smartbox.investory.shared.time.ApplicationTime;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Syncs the current and previous Warsaw months. The lock also covers on-demand executions. */
@Slf4j
@Component
public class RyczaltKsefSyncJob {
  private static final long LOCK_KEY = 0x4b53454653594e43L; // KSEFSYNC

  private final KsefSyncJobPort ksef;
  private final ApplicationTime time;
  private final JdbcTemplate jdbc;
  private final boolean enabled;

  public RyczaltKsefSyncJob(
      KsefSyncJobPort ksef,
      ApplicationTime time,
      JdbcTemplate jdbc,
      @Value("${app.ryczalt.ksef.sync.enabled:false}") boolean enabled) {
    this.ksef = ksef;
    this.time = time;
    this.jdbc = jdbc;
    this.enabled = enabled;
  }

  public void run() {
    if (!enabled) throw new IllegalStateException("Scheduled KSeF sync is disabled");
    YearMonth current = YearMonth.from(time.now(time.businessZone()));
    jdbc.execute(
        (ConnectionCallback<Void>)
            connection -> {
              if (!advisoryLock(connection, "select pg_try_advisory_lock(?)"))
                throw new IllegalStateException("Another KSeF sync job is running");
              try {
                syncMonths(List.of(current.minusMonths(1), current));
              } finally {
                advisoryLock(connection, "select pg_advisory_unlock(?)");
              }
              return null;
            });
  }

  private void syncMonths(List<YearMonth> months) {
    List<YearMonth> failures = new ArrayList<>();
    for (YearMonth month : months) {
      try {
        ksef.sync(month);
      } catch (RuntimeException exception) {
        failures.add(month);
        log.error("Scheduled KSeF sync failed for month={}", month, exception);
      }
    }
    if (!failures.isEmpty())
      throw new IllegalStateException("Scheduled KSeF sync failed for months " + failures);
  }

  private static boolean advisoryLock(Connection connection, String sql) throws SQLException {
    try (PreparedStatement statement = connection.prepareStatement(sql)) {
      statement.setLong(1, LOCK_KEY);
      try (ResultSet result = statement.executeQuery()) {
        return result.next() && result.getBoolean(1);
      }
    }
  }
}
