package com.smartbox.investory.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartbox.investory.ryczalt.application.ksef.RyczaltKsefApi;
import com.smartbox.investory.ryczalt.application.ksef.RyczaltKsefSyncResult;
import com.smartbox.investory.ryczalt.persistence.RyczaltPeriodJpaRepository;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.Test;

class RyczaltKsefIntegrationJobPortTest {
  @Test
  void rejectedInvoicesFailTheJobAfterOtherProfilesAreSynced() {
    RyczaltKsefApi ksef = mock(RyczaltKsefApi.class);
    RyczaltPeriodJpaRepository periods = mock(RyczaltPeriodJpaRepository.class);
    YearMonth month = YearMonth.of(2026, 9);
    when(periods.findDistinctProfileIds()).thenReturn(List.of(1L, 2L));
    when(ksef.sync(eq(1L), eq(month), anySet()))
        .thenReturn(new RyczaltKsefSyncResult(2, 1, 0, 0, 1));
    when(ksef.sync(eq(2L), eq(month), anySet()))
        .thenReturn(new RyczaltKsefSyncResult(1, 1, 0, 0, 0));

    assertThatThrownBy(() -> new RyczaltKsefIntegrationJobPort(ksef, periods).sync(month))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("profiles [1]");
    verify(ksef).sync(eq(2L), eq(month), anySet());
  }
}
