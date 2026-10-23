package com.smartbox.investory.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
import com.smartbox.investory.ryczalt.integration.fx.RyczaltFxRateService;
import com.smartbox.investory.shared.time.ClockApplicationTime;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;

class RyczaltFxRateJobSchedulerTest {
  private final IntegrationJobRepository jobs = mock(IntegrationJobRepository.class);
  private final IntegrationInstanceRepository instances = mock(IntegrationInstanceRepository.class);
  private final RyczaltFxRateService fxRates = mock(RyczaltFxRateService.class);
  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
  private ClockApplicationTime time = time("2026-10-31T22:05:00Z");

  @Test
  void monthEndJobRunsUnderLockAndMigratesOldDefaultSchedule() throws Exception {
    IntegrationJobEntity job = job();
    active(job);
    lock(true);
    when(jobs.save(any(IntegrationJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(fxRates.refreshMonth(YearMonth.of(2026, 10)))
        .thenReturn(new RyczaltFxRateService.FxRateRefreshResult(YearMonth.of(2026, 10), 4, 4, 62, 0, 0));

    scheduler().poll();

    verify(fxRates).refreshMonth(YearMonth.of(2026, 10));
    assertThat(job.getCron()).isEqualTo("0 0 23 L * *");
    assertThat(job.getLastStatus()).isEqualTo("SUCCESS");
    assertThat(job.getLastCompletedAt()).isNotNull();
  }

  @Test
  void firstRunWaitsUntilLastDayOfMonth() {
    time = time("2026-10-22T21:05:00Z");
    IntegrationJobEntity job = job();
    job.setCron("0 0 23 L * *");
    job.setLastCompletedAt(null);
    active(job);

    scheduler().poll();

    verifyNoInteractions(jdbc, fxRates);
    verify(jobs, never()).save(any());
  }

  @ParameterizedTest
  @CsvSource({
      "2026-10-23T12:00:00Z, 2026-09",
      "2026-10-30T23:05:00Z, 2026-10", // Already the last day in Warsaw.
      "2026-10-31T22:05:00Z, 2026-10",
      "2026-01-01T12:00:00Z, 2025-12",
      "2027-02-28T12:00:00Z, 2027-02",
      "2028-02-28T12:00:00Z, 2028-01",
      "2028-02-29T12:00:00Z, 2028-02",
      "2026-10-31T23:05:00Z, 2026-10" // First day of November in Warsaw.
  })
  void overdueOrForcedRunRefreshesLatestMonthWhoseLastDayHasArrived(
      String instant, String expectedMonth) throws Exception {
    time = time(instant);
    YearMonth expected = YearMonth.parse(expectedMonth);
    IntegrationJobEntity job = job();
    job.setCron("0 0 23 L * *");
    job.setLastCompletedAt(expected.minusMonths(2).atEndOfMonth().atTime(23, 0)
        .atZone(ZoneId.of("Europe/Warsaw")));
    active(job);
    lock(true);
    when(fxRates.refreshMonth(expected)).thenReturn(
        new RyczaltFxRateService.FxRateRefreshResult(expected, 4, 4, 60, 0, 0));

    scheduler().poll();

    verify(fxRates).refreshMonth(expected);
    assertThat(job.getLastStatus()).isEqualTo("SUCCESS");
    assertThat(job.getCron()).isEqualTo("0 0 23 L * *");
    assertThat(job.getLastStartedAt()).isEqualTo(time.now(ZoneId.of("Europe/Warsaw")));
    assertThat(job.getLastCompletedAt()).isEqualTo(time.now(ZoneId.of("Europe/Warsaw")));
  }

  @Test
  void providerFailureRemainsFailedWithoutInventingRates() throws Exception {
    time = time("2026-10-23T12:00:00Z");
    IntegrationJobEntity job = job();
    job.setLastCompletedAt(ZonedDateTime.parse("2026-08-31T23:00:00+02:00[Europe/Warsaw]"));
    active(job);
    lock(true);
    when(fxRates.refreshMonth(YearMonth.of(2026, 9)))
        .thenThrow(new IllegalStateException("NBP returned HTTP 400"));

    scheduler().poll();

    assertThat(job.getLastStatus()).isEqualTo("FAILED");
    assertThat(job.getLastError()).isEqualTo("NBP returned HTTP 400");
    assertThat(job.getLastCompletedAt()).isNotNull();
    verify(fxRates, never()).refreshMonth(YearMonth.of(2026, 10));
  }

  private RyczaltFxRateJobScheduler scheduler() {
    return new RyczaltFxRateJobScheduler(jobs, instances, fxRates, time, jdbc);
  }

  private static IntegrationJobEntity job() {
    IntegrationJobEntity job = new IntegrationJobEntity();
    job.setId(4L);
    job.setIntegrationInstanceId(8L);
    job.setJobType("refresh-rates");
    job.setEnabled(true);
    job.setCron("0 0 3 * * 1-5");
    job.setTimezone("Europe/Warsaw");
    job.setLastCompletedAt(ZonedDateTime.parse("2026-09-30T23:00:00+02:00[Europe/Warsaw]"));
    return job;
  }

  private void active(IntegrationJobEntity job) {
    when(jobs.findByEnabledTrueAndJobType("refresh-rates")).thenReturn(List.of(job));
    when(jobs.findById(4L)).thenReturn(Optional.of(job));
    IntegrationInstanceEntity instance = new IntegrationInstanceEntity();
    instance.setId(8L);
    instance.setEnabled(true);
    instance.setPluginId("nbp");
    instance.setPluginType(IntegrationType.FX_DATA);
    when(instances.findById(8L)).thenReturn(Optional.of(instance));
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
        .thenAnswer(
            invocation ->
                invocation.<ConnectionCallback<?>>getArgument(0).doInConnection(connection));
  }

  private static ClockApplicationTime time(String instant) {
    return new ClockApplicationTime(
        Clock.fixed(Instant.parse(instant), ZoneId.of("UTC")), ZoneId.of("Europe/Warsaw"));
  }
}
