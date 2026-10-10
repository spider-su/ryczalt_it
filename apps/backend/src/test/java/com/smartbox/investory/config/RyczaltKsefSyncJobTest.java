package com.smartbox.investory.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.smartbox.investory.integrations.ksef.KsefSyncJobPort;
import com.smartbox.investory.shared.time.ClockApplicationTime;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class RyczaltKsefSyncJobTest {
  private final KsefSyncJobPort ksef = mock(KsefSyncJobPort.class);
  private final ClockApplicationTime time =
      new ClockApplicationTime(
          Clock.fixed(Instant.parse("2026-10-31T23:30:00Z"), ZoneId.of("UTC")),
          ZoneId.of("Europe/Warsaw"));

  @Test
  void syncsPreviousAndCurrentWarsawMonths() {
    new RyczaltKsefSyncJob(ksef, time, true).run();

    verify(ksef).sync(YearMonth.of(2026, 10));
    verify(ksef).sync(YearMonth.of(2026, 11));
  }

  @Test
  void disabledJobDoesNotSync() {
    assertThatThrownBy(() -> new RyczaltKsefSyncJob(ksef, time, false).run())
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("disabled");

    verifyNoInteractions(ksef);
  }

  @Test
  void failedPreviousMonthDoesNotSkipCurrentMonth() {
    doThrow(new IllegalStateException("source unavailable"))
        .when(ksef)
        .sync(YearMonth.of(2026, 10));

    assertThatThrownBy(() -> new RyczaltKsefSyncJob(ksef, time, true).run())
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("2026-10");

    verify(ksef).sync(YearMonth.of(2026, 11));
  }
}
