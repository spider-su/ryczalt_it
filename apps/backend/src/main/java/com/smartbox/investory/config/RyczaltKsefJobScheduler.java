package com.smartbox.investory.config;

import com.smartbox.investory.integrations.ksef.KsefIntegrationPlugin;
import com.smartbox.investory.integrations.management.api.model.IntegrationType;
import com.smartbox.investory.integrations.management.persistence.IntegrationInstanceRepository;
import com.smartbox.investory.integrations.management.persistence.IntegrationJobEntity;
import com.smartbox.investory.integrations.management.persistence.IntegrationJobRepository;
import com.smartbox.investory.shared.time.ApplicationTime;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

/** Polls persisted KSeF jobs, as Investory does for integration jobs. */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true")
public class RyczaltKsefJobScheduler {
  private static final String JOB_TYPE = "sync-invoices";
  private static final long LOCK_KEY = 0x4b5345464a4f4253L; // KSEFJOBS

  private final IntegrationJobRepository jobs;
  private final IntegrationInstanceRepository instances;
  private final RyczaltKsefSyncJob sync;
  private final ApplicationTime time;
  private final JdbcTemplate jdbc;

  @Scheduled(fixedDelayString = "${app.integrations.scheduler-poll-ms:60000}")
  public void poll() {
    for (IntegrationJobEntity candidate : jobs.findByEnabledTrueAndJobType(JOB_TYPE)) {
      if (!due(candidate)) continue;
      jdbc.execute(
          (ConnectionCallback<Void>)
              connection -> {
                if (!advisoryLock(connection, "select pg_try_advisory_lock(?)", candidate.getId()))
                  return null;
                try {
                  jobs.findById(candidate.getId())
                      .filter(IntegrationJobEntity::isEnabled)
                      .filter(job -> JOB_TYPE.equals(job.getJobType()))
                      .filter(this::due)
                      .ifPresent(this::run);
                } finally {
                  advisoryLock(connection, "select pg_advisory_unlock(?)", candidate.getId());
                }
                return null;
              });
    }
  }

  private boolean due(IntegrationJobEntity job) {
    if (instances
        .findById(job.getIntegrationInstanceId())
        .filter(instance -> instance.isEnabled())
        .filter(instance -> instance.getOwnerId() == null)
        .filter(instance -> KsefIntegrationPlugin.ID.equals(instance.getPluginId()))
        .filter(instance -> instance.getPluginType() == IntegrationType.E_INVOICING)
        .isEmpty())
      return false;
    try {
      ZoneId zone = ZoneId.of(job.getTimezone());
      CronExpression cron = CronExpression.parse(job.getCron());
      ZonedDateTime completed = job.getLastCompletedAt();
      if (completed == null) return true;
      ZonedDateTime next = cron.next(completed.withZoneSameInstant(zone));
      return next != null && !next.isAfter(time.now(zone));
    } catch (RuntimeException exception) {
      log.warn("Skipping invalid KSeF job {}: {}", job.getId(), exception.getMessage());
      return false;
    }
  }

  private void run(IntegrationJobEntity job) {
    job.setLastStartedAt(time.now(time.businessZone()));
    job.setLastStatus("STARTED");
    job.setLastError(null);
    jobs.save(job);
    try {
      sync.run();
      job.setLastStatus("SUCCESS");
      log.info("KSeF integration job {} succeeded", job.getId());
    } catch (RuntimeException exception) {
      job.setLastStatus("FAILED");
      String message = exception.getMessage();
      job.setLastError(
          message == null ? exception.getClass().getSimpleName() : message.substring(0, Math.min(500, message.length())));
      log.error("KSeF integration job {} failed", job.getId(), exception);
    } finally {
      job.setLastCompletedAt(time.now(time.businessZone()));
      jobs.save(job);
    }
  }

  private static boolean advisoryLock(Connection connection, String sql, long id) throws SQLException {
    try (PreparedStatement statement = connection.prepareStatement(sql)) {
      statement.setLong(1, LOCK_KEY ^ id);
      try (ResultSet result = statement.executeQuery()) {
        return result.next() && result.getBoolean(1);
      }
    }
  }
}
