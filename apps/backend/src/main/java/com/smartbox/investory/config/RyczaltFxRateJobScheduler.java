package com.smartbox.investory.config;

import com.smartbox.investory.integrations.fx.nbp.NbpFxDataIntegrationPlugin;
import com.smartbox.investory.integrations.management.api.model.IntegrationJobDescriptor;
import com.smartbox.investory.integrations.management.api.model.IntegrationType;
import com.smartbox.investory.integrations.management.persistence.IntegrationInstanceRepository;
import com.smartbox.investory.integrations.management.persistence.IntegrationJobEntity;
import com.smartbox.investory.integrations.management.persistence.IntegrationJobRepository;
import com.smartbox.investory.ryczalt.integration.fx.RyczaltFxRateService;
import com.smartbox.investory.shared.time.ApplicationTime;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.YearMonth;
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

/** Executes the persisted NBP refresh-rates job using the configured integration schedule. */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true")
public class RyczaltFxRateJobScheduler {
  private static final String JOB_TYPE = "refresh-rates";
  private static final String PREVIOUS_DEFAULT_CRON = "0 15 6 * * *";
  private static final long LOCK_KEY = 0x4658524154454a42L; // FXRATEJB

  private final IntegrationJobRepository jobs;
  private final IntegrationInstanceRepository instances;
  private final RyczaltFxRateService fxRates;
  private final ApplicationTime time;
  private final JdbcTemplate jdbc;

  @Scheduled(fixedDelayString = "${app.integrations.scheduler-poll-ms:60000}")
  public void poll() {
    for (IntegrationJobEntity candidate : jobs.findByEnabledTrueAndJobType(JOB_TYPE)) {
      if (!belongsToNbp(candidate)) continue;
      normalizePreviousDefault(candidate);
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
                      .filter(this::belongsToNbp)
                      .filter(this::due)
                      .ifPresent(this::run);
                } finally {
                  advisoryLock(connection, "select pg_advisory_unlock(?)", candidate.getId());
                }
                return null;
              });
    }
  }

  private void normalizePreviousDefault(IntegrationJobEntity job) {
    if (!PREVIOUS_DEFAULT_CRON.equals(job.getCron())) return;
    var descriptor = IntegrationJobDescriptor.forType(JOB_TYPE);
    job.setCron(descriptor.defaultCron());
    job.setTimezone(descriptor.defaultTimezone());
    jobs.save(job);
    log.info("Updated FX refresh job {} to the month-end schedule", job.getId());
  }

  private boolean belongsToNbp(IntegrationJobEntity job) {
    return instances
        .findById(job.getIntegrationInstanceId())
        .filter(instance -> instance.isEnabled())
        .filter(instance -> instance.getOwnerId() == null)
        .filter(instance -> NbpFxDataIntegrationPlugin.ID.equals(instance.getPluginId()))
        .filter(instance -> instance.getPluginType() == IntegrationType.FX_DATA)
        .isPresent();
  }

  private boolean due(IntegrationJobEntity job) {
    try {
      ZoneId zone = ZoneId.of(job.getTimezone());
      CronExpression cron = CronExpression.parse(job.getCron());
      ZonedDateTime now = time.now(zone);
      ZonedDateTime completed = job.getLastCompletedAt();
      if (completed != null) {
        ZonedDateTime next = cron.next(completed.withZoneSameInstant(zone));
        return next != null && !next.isAfter(now);
      }
      ZonedDateTime monthStart = now.toLocalDate().withDayOfMonth(1).atStartOfDay(zone).minusNanos(1);
      ZonedDateTime firstRun = cron.next(monthStart);
      return firstRun != null && !firstRun.isAfter(now);
    } catch (RuntimeException exception) {
      log.warn("Skipping invalid FX refresh job {}: {}", job.getId(), exception.getMessage());
      return false;
    }
  }

  private void run(IntegrationJobEntity job) {
    ZoneId zone = ZoneId.of(job.getTimezone());
    ZonedDateTime startedAt = time.now(zone);
    job.setLastStartedAt(startedAt);
    job.setLastStatus("STARTED");
    job.setLastError(null);
    jobs.save(job);
    try {
      var result = fxRates.refreshMonth(YearMonth.from(startedAt));
      job.setLastStatus("SUCCESS");
      log.info(
          "NBP FX refresh completed: jobId={}, month={}, observations={}, ratesInserted={}, resolutionsInserted={}",
          job.getId(),
          result.month(),
          result.observationsReceived(),
          result.ratesInserted(),
          result.resolutionsInserted());
    } catch (RuntimeException exception) {
      job.setLastStatus("FAILED");
      String message = exception.getMessage();
      job.setLastError(
          message == null
              ? exception.getClass().getSimpleName()
              : message.substring(0, Math.min(500, message.length())));
      log.error("NBP FX refresh job {} failed", job.getId(), exception);
    } finally {
      job.setLastCompletedAt(time.now(zone));
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
