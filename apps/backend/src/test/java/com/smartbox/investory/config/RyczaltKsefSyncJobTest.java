package com.smartbox.investory.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.smartbox.investory.integrations.ksef.KsefSyncJobPort;
import com.smartbox.investory.shared.time.ClockApplicationTime;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;

class RyczaltKsefSyncJobTest {
  private final KsefSyncJobPort ksef = mock(KsefSyncJobPort.class);
  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
  private final ClockApplicationTime time =
      new ClockApplicationTime(
          Clock.fixed(Instant.parse("2026-10-31T23:30:00Z"), ZoneId.of("UTC")),
          ZoneId.of("Europe/Warsaw"));

  @Test
  void syncsPreviousAndCurrentWarsawMonthsUnderDatabaseLock() throws Exception {
    Connection connection = lockConnection(true);
    when(jdbc.execute(any(ConnectionCallback.class)))
        .thenAnswer(invocation -> invocation.<ConnectionCallback<?>>getArgument(0).doInConnection(connection));

    new RyczaltKsefSyncJob(ksef, time, jdbc, true).run();

    verify(ksef).sync(YearMonth.of(2026, 10));
    verify(ksef).sync(YearMonth.of(2026, 11));
    verify(connection).prepareStatement(eq("select pg_advisory_unlock(?)"));
  }

  @Test
  void disabledJobDoesNotAcquireLockOrSync() {
    assertThatThrownBy(() -> new RyczaltKsefSyncJob(ksef, time, jdbc, false).run())
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("disabled");

    verifyNoInteractions(jdbc, ksef);
  }

  @Test
  void unavailableLockPreventsOverlappingSync() throws Exception {
    Connection connection = lockConnection(false);
    when(jdbc.execute(any(ConnectionCallback.class)))
        .thenAnswer(invocation -> invocation.<ConnectionCallback<?>>getArgument(0).doInConnection(connection));

    assertThatThrownBy(() -> new RyczaltKsefSyncJob(ksef, time, jdbc, true).run())
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("is running");

    verifyNoInteractions(ksef);
  }

  @Test
  void failedPreviousMonthDoesNotSkipCurrentMonth() throws Exception {
    Connection connection = lockConnection(true);
    when(jdbc.execute(any(ConnectionCallback.class)))
        .thenAnswer(invocation -> invocation.<ConnectionCallback<?>>getArgument(0).doInConnection(connection));
    doThrow(new IllegalStateException("source unavailable"))
        .when(ksef)
        .sync(YearMonth.of(2026, 10));

    assertThatThrownBy(() -> new RyczaltKsefSyncJob(ksef, time, jdbc, true).run())
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("2026-10");

    verify(ksef).sync(YearMonth.of(2026, 11));
    verify(connection).prepareStatement(eq("select pg_advisory_unlock(?)"));
  }

  private static Connection lockConnection(boolean acquired) throws Exception {
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
    return connection;
  }
}
