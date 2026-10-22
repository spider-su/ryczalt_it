package com.smartbox.investory.ryczalt.integration.fx;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.smartbox.investory.integrations.fx.nbp.NbpClient;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class NbpFxRateAdapterTest {
  @Test
  void mapsLatestPublishedRateWithoutFloatingPointConversion() {
    NbpClient.NbpRate rate = new NbpClient.NbpRate();
    rate.setCode("EUR");
    rate.setMid(new BigDecimal("4.2718"));
    NbpClient.NbpTable table = new NbpClient.NbpTable();
    table.setEffectiveDate(LocalDate.of(2026, 9, 18));
    table.setRates(List.of(rate));

    NbpFxRateAdapter adapter =
        new NbpFxRateAdapter(new StubNbpClient(table), "https://example.test/api");

    FxRate result = adapter.fetch("eur", LocalDate.of(2026, 9, 21));

    assertEquals("EUR", result.currency());
    assertEquals(LocalDate.of(2026, 9, 18), result.effectiveDate());
    assertEquals(new BigDecimal("4.2718"), result.rate());
    assertEquals("NBP-A-2026-09-18", result.providerReference());
  }

  @Test
  void fetchHistoryReturnsSupportedCurrenciesForEachPublishedTable() {
    NbpClient.NbpTable table = table("2026-09-30", "4.27", "3.71");
    NbpFxRateAdapter adapter =
        new NbpFxRateAdapter(new StubNbpClient(table), "https://example.test/api");

    List<FxRate> history =
        adapter.fetchHistory(LocalDate.of(2026, 9, 24), LocalDate.of(2026, 10, 31));

    assertEquals(2, history.size());
    assertEquals("EUR", history.get(0).currency());
    assertEquals(new BigDecimal("4.27"), history.get(0).rate());
    assertEquals("USD", history.get(1).currency());
    assertEquals(new BigDecimal("3.71"), history.get(1).rate());
    assertEquals(LocalDate.of(2026, 9, 30), history.get(1).effectiveDate());
  }

  private static NbpClient.NbpTable table(String date, String eur, String usd) {
    NbpClient.NbpRate eurRate = new NbpClient.NbpRate();
    eurRate.setCode("EUR");
    eurRate.setMid(new BigDecimal(eur));
    NbpClient.NbpRate usdRate = new NbpClient.NbpRate();
    usdRate.setCode("USD");
    usdRate.setMid(new BigDecimal(usd));
    NbpClient.NbpTable table = new NbpClient.NbpTable();
    table.setEffectiveDate(LocalDate.parse(date));
    table.setRates(List.of(eurRate, usdRate));
    return table;
  }

  private static final class StubNbpClient extends NbpClient {
    private final List<NbpTable> tables;

    private StubNbpClient(NbpTable... tables) {
      super(new ObjectMapper());
      this.tables = new ArrayList<>(List.of(tables));
    }

    @Override
    public List<NbpTable> findTables(LocalDate from, LocalDate to, String baseUrl) {
      return tables;
    }
  }
}
