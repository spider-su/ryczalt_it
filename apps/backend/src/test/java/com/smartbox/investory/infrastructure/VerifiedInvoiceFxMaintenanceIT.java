package com.smartbox.investory.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class VerifiedInvoiceFxMaintenanceIT {
  @Test
  void backfillsOnlyVerifiedMatchingApprovedInvoicesAndPreservesAccountingFacts() throws Exception {
    try (var database = MigrationTestDatabase.open("verified-invoice-fx")) {
      MigrationTestDatabase.migrate(database);
      try (var connection = MigrationTestDatabase.connection(database);
          var statement = connection.createStatement()) {
        statement.executeUpdate("INSERT INTO ryczalt.app_users(username,display_name) VALUES ('fx-test','FX Test')");
        statement.executeUpdate("""
            INSERT INTO ryczalt.portfolios(name,user_id)
            SELECT name, u.id FROM ryczalt.app_users u
            CROSS JOIN (VALUES ('FX A'),('FX B')) p(name) WHERE u.username='fx-test'
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_period(profile_id,period_year,period_month,status)
            SELECT id,2026,1,CASE WHEN name='FX B' THEN 'FROZEN' ELSE 'OPEN' END
            FROM ryczalt.portfolios WHERE name IN ('FX A','FX B')
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_invoice(period_id,profile_id,direction,reference,
                issue_date,accounting_date,net_amount,vat_amount,gross_amount,currency,
                booked_net_pln,approval_status,fx_rate)
            SELECT p.id,p.profile_id,'INCOME','FX-' || n,DATE '2026-01-05',DATE '2026-01-05',
                100,0,100,'EUR',CASE WHEN n=2 THEN 421 WHEN n=3 THEN NULL ELSE 420 END,
                CASE WHEN n=3 THEN 'NEEDS_REVIEW' ELSE 'APPROVED' END,
                CASE WHEN n=4 THEN 4.2 ELSE NULL END
            FROM ryczalt.ryczalt_period p JOIN ryczalt.portfolios f ON f.id=p.profile_id
            CROSS JOIN generate_series(1,5) n WHERE f.name='FX A'
            """);
        statement.executeUpdate("""
            INSERT INTO ryczalt.ryczalt_invoice(period_id,profile_id,direction,reference,
                issue_date,accounting_date,net_amount,vat_amount,gross_amount,currency,
                booked_net_pln,approval_status)
            SELECT p.id,p.profile_id,'INCOME','FX-6',DATE '2026-01-05',DATE '2026-01-05',
                100,0,100,'EUR',420,'APPROVED'
            FROM ryczalt.ryczalt_period p JOIN ryczalt.portfolios f ON f.id=p.profile_id WHERE f.name='FX B'
            """);
        statement.execute("""
            CREATE TEMP TABLE verified_invoice_fx(
                profile_id bigint, invoice_id bigint, currency varchar(3), requested_date date,
                effective_date date,rate numeric(19,8),provider_reference varchar(256))
            """);
        statement.executeUpdate("""
            INSERT INTO verified_invoice_fx
            SELECT CASE WHEN reference='FX-5' THEN
                (SELECT id FROM ryczalt.portfolios WHERE name='FX B') ELSE profile_id END,
                id,'EUR',DATE '2026-01-02',DATE '2026-01-02',4.2,'NBP-A-2026-01-02'
            FROM ryczalt.ryczalt_invoice
            """);
        String before;
        try (var result = statement.executeQuery("""
            SELECT jsonb_agg(to_jsonb(i) - ARRAY['fx_rate','fx_effective_date','fx_provider',
                'fx_provider_reference','updated_at'] ORDER BY id)::text FROM ryczalt.ryczalt_invoice i
            """)) {
          result.next(); before = result.getString(1);
        }
        MigrationTestDatabase.executeMaintenanceScript(connection, "sql/maintenance/backfill_verified_invoice_fx.sql");
        assertEquals(1, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.ryczalt_invoice WHERE fx_provider='NBP'"));
        assertEquals(1, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.ryczalt_audit_event WHERE event_type='INVOICE_FX_BACKFILLED'"));
        try (var result = statement.executeQuery("""
            SELECT jsonb_agg(to_jsonb(i) - ARRAY['fx_rate','fx_effective_date','fx_provider',
                'fx_provider_reference','updated_at'] ORDER BY id)::text FROM ryczalt.ryczalt_invoice i
            """)) {
          result.next(); assertEquals(before, result.getString(1));
        }
        MigrationTestDatabase.executeMaintenanceScript(connection, "sql/maintenance/backfill_verified_invoice_fx.sql");
        assertEquals(1, MigrationTestDatabase.singleInt(statement,
            "SELECT count(*) FROM ryczalt.ryczalt_audit_event WHERE event_type='INVOICE_FX_BACKFILLED'"));
      }
    }
  }
}
