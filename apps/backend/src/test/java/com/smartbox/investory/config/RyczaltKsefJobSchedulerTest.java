package com.smartbox.investory.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.smartbox.investory.integrations.management.api.model.IntegrationType;
import com.smartbox.investory.integrations.management.persistence.IntegrationInstanceEntity;
import com.smartbox.investory.integrations.management.persistence.IntegrationInstanceRepository;
import com.smartbox.investory.integrations.management.persistence.IntegrationJobEntity;
import com.smartbox.investory.integrations.management.persistence.IntegrationJobRepository;
import com.smartbox.investory.shared.time.ClockApplicationTime;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;

class RyczaltKsefJobSchedulerTest {
  private final IntegrationJobRepository jobs = mock(IntegrationJobRepository.class);
  private final IntegrationInstanceRepository instances = mock(IntegrationInstanceRepository.class);
  private final RyczaltKsefSyncJob sync = mock(RyczaltKsefSyncJob.class);
  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
  private final ClockApplicationTime time =
      new ClockApplicationTime(
          Clock.fixed(Instant.parse("2026-10-10T00:05:00Z"), ZoneId.of("UTC")),
          ZoneId.of("Europe/Warsaw"));

  @Test
  void dueJobRunsUnderLockAndRecordsSuccess() throws Exception {
    IntegrationJobEntity job = job();
    active(job);
    lock(true);
    List<String> statuses = new ArrayList<>();
    when(jobs.save(any(IntegrationJobEntity.class)))
        .thenAnswer(invocation -> {
          IntegrationJobEntity saved = invocation.getArgument(0);
          statuses.add(saved.getLastStatus());
          return saved;
        });

    scheduler().poll();

    verify(sync).run();
    assertThat(statuses).containsExactly("STARTED", "SUCCESS");
    assertThat(job.getLastCompletedAt()).isNotNull();
  }

  @Test
  void notYetDueJobDoesNotClaimLock() {
    IntegrationJobEntity job = job();
    job.setLastCompletedAt(ZonedDateTime.parse("2026-10-10T00:02:00Z"));
    active(job);

    scheduler().poll();

    verifyNoInteractions(jdbc, sync);
  }

  @Test
  void disabledIntegrationDoesNotRun() {
    IntegrationJobEntity job = job();
    when(jobs.findByEnabledTrueAndJobType("sync-invoices")).thenReturn(List.of(job));
    IntegrationInstanceEntity instance = new IntegrationInstanceEntity();
    instance.setEnabled(false);
    when(instances.findById(7L)).thenReturn(Optional.of(instance));

    scheduler().poll();

    verifyNoInteractions(jdbc, sync);
  }

  @Test
  void jobForAnotherPluginDoesNotRunKsef() {
    IntegrationJobEntity job = job();
    when(jobs.findByEnabledTrueAndJobType("sync-invoices")).thenReturn(List.of(job));
    IntegrationInstanceEntity instance = new IntegrationInstanceEntity();
    instance.setEnabled(true);
    instance.setPluginId("other");
    instance.setPluginType(IntegrationType.E_INVOICING);
    when(instances.findById(7L)).thenReturn(Optional.of(instance));

    scheduler().poll();

    verifyNoInteractions(jdbc, sync);
  }

  @Test
  void invalidCronIsSkippedEvenWithoutPreviousCompletion() {
    IntegrationJobEntity job = job();
    job.setCron("invalid");
    job.setLastCompletedAt(null);
    active(job);

    scheduler().poll();

    verifyNoInteractions(jdbc, sync);
  }

  @Test
  void unavailableLockSkipsWithoutChangingStatus() throws Exception {
    IntegrationJobEntity job = job();
    active(job);
    lock(false);

    scheduler().poll();

    verifyNoInteractions(sync);
    verify(jobs, never()).save(any());
  }

  @Test
  void failureIsPersistedWithoutStoppingThePoller() throws Exception {
    IntegrationJobEntity job = job();
    active(job);
    lock(true);
    doThrow(new IllegalStateException("source unavailable")).when(sync).run();
    List<String> statuses = new ArrayList<>();
    when(jobs.save(any(IntegrationJobEntity.class)))
        .thenAnswer(invocation -> {
          IntegrationJobEntity saved = invocation.getArgument(0);
          statuses.add(saved.getLastStatus());
          return saved;
        });

    scheduler().poll();

    assertThat(statuses).containsExactly("STARTED", "FAILED");
    assertThat(job.getLastError()).contains("source unavailable");
    assertThat(job.getLastCompletedAt()).isNotNull();
  }

  private RyczaltKsefJobScheduler scheduler() {
    return new RyczaltKsefJobScheduler(jobs, instances, sync, time, jdbc);
  }

  private static IntegrationJobEntity job() {
    IntegrationJobEntity job = new IntegrationJobEntity();
    job.setId(3L);
    job.setIntegrationInstanceId(7L);
    job.setJobType("sync-invoices");
    job.setEnabled(true);
    job.setCron("0 0 2 * * *");
    job.setLastCompletedAt(ZonedDateTime.parse("2026-10-09T00:00:00Z"));
    return job;
  }

  private void active(IntegrationJobEntity job) {
    when(jobs.findByEnabledTrueAndJobType("sync-invoices")).thenReturn(List.of(job));
    when(jobs.findById(3L)).thenReturn(Optional.of(job));
    IntegrationInstanceEntity instance = new IntegrationInstanceEntity();
    instance.setEnabled(true);
    instance.setPluginId("ksef");
    instance.setPluginType(IntegrationType.E_INVOICING);
    when(instances.findById(7L)).thenReturn(Optional.of(instance));
  }

  private void lock(boolean acquired) throws Exception {
    Connection connection = mock(Connection.class);
    PreparedStatement claim = mock(PreparedStatement.class);
    PreparedStatement release = mock(PreparedStatement.class);
    ResultSet claimResult = mock(ResultSet.class);
    ResultSet releaseResult = mock(ResultSet.class);
    when(connection.prepareStatement("select pg_try_advisory_lock(?)")).thenReturn(claim);
    when(connection.prepareStatement("select pg_advisory_unlock(?)")).thenReturn(release);
    when(claim.executeQuery()).thenReturn(claimResult);
    when(claimResult.next()).thenReturn(true);
    when(claimResult.getBoolean(1)).thenReturn(acquired);
    when(release.executeQuery()).thenReturn(releaseResult);
    when(jdbc.execute(any(ConnectionCallback.class)))
        .thenAnswer(invocation -> invocation.<ConnectionCallback<?>>getArgument(0).doInConnection(connection));
  }
}
