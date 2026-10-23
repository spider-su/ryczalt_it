# Accounting input and historical FX remediation — 2026-10-22

Scope: k3s Ryczałt IT database and source on `develop`. Database maintenance was
applied; application changes have not been deployed. No Neon changes were made.

## Root causes and source changes

Monthly input storage accepted unknown paid contribution amounts and profiles
without an opening accounting state. The calculator already rejected these
facts, but `NeedsReviewException` became HTTP 500 and customer web replaced
validation responses with a generic backend response error. Customer web had no
form for entering the required facts.

The input service now rejects missing actual paid social/health amounts before
writing, requires accounting start configuration, and keeps explicit zero as a
valid supplied fact. Missing opening values return HTTP 400 with the field name.
A read-authorized GET on the existing `input-settings` route returns saved values,
configured start date and missing field names. It does not manufacture amounts.
New monthly rows invalidate affected calculations, just as edits do.

The accounting issues response exposes missing input configuration even if old
calculations exist. Historical foreign invoices with incomplete FX snapshots
appear as review warnings identifying the invoice. Calculation failures requiring
review return HTTP 409 with their reason. Customer web preserves structured
400/409 explanations and provides an Accounting inputs form linked from the
accounting page. The form supports actual paid contributions and opening balances,
retains submitted values after validation errors, and uses existing authorization,
profile binding, bearer forwarding and CSRF protection. It supports the existing
2026 write scope; older input rows remain readable.

The historical POC invoice path had saved booked PLN amounts without FX
provenance. Rate refresh does not retroactively populate invoice snapshots. The
one-time repair independently verifies historical NBP observations, then permits
metadata updates only when the existing booked amounts match current rounding
policy. It does not derive a historical rate by dividing the invoice amounts.

FX refresh logs now distinguish inserted observations/resolutions, unchanged
observations/resolutions and `UPDATED` versus `NO_NEW_DATA`. Stored job success
remains an execution outcome; these counts provide evidence of actual inserts.
The scheduler also recognizes the observed legacy weekday cron when normalizing
to the month-end default. These scheduler changes take effect after deployment.

## Applied database changes

The exact mutation SQL is:

- `apps/backend/src/main/resources/sql/maintenance/backfill_verified_invoice_fx.sql`

The runner is:

- `apps/backend/scripts/backfill_verified_invoice_fx.py`

The SQL runs outside Flyway. A transaction-local `verified_invoice_fx` table is
populated with independently fetched NBP observations. The update checks profile
and invoice identity, currency, prior business date, effective date, positive
rate, approval, unfrozen period, an entirely absent FX snapshot and an exact
rounded booked-amount match. Existing booked VAT must match when present; absent
booked VAT is accepted only when original VAT is zero. The statement changes only
`fx_rate`, `fx_effective_date`, `fx_provider`, `fx_provider_reference` and
`updated_at`, and inserts one `INVOICE_FX_BACKFILLED` audit event per updated row.
Re-execution is idempotent because an existing snapshot is excluded.

The runner uses standard PostgreSQL `PG*` environment variables and requires
`psycopg[binary]`. Resolve credentials from the workload into process environment;
do not put them in command arguments or documentation. Run without flags for a
rolled-back preview; pass `--apply` to commit. A preview does not allocate audit
sequence numbers. It prints aggregate counts, not invoice amounts or credentials.
Network/provider failures abort the transaction; unavailable historical dates
remain excluded. The runner compares every non-FX invoice field before and after
and rolls back if any accounting fact changed.

| Applied operation / verification | Rows or dates |
| --- | ---: |
| Foreign invoices initially missing all FX metadata | 32 |
| Distinct historical currency/date requests independently verified with NBP | 23 |
| NBP dates unavailable | 0 |
| Invoice FX snapshots updated | 29 |
| Audit events inserted | 29 |
| Existing invoice amounts or approval states changed | 0 |
| Invoices left without FX metadata | 3 |
| Remaining approved invoice with unmatched historical FX/booked amount | 1 |
| Remaining review invoices without booked net amounts | 2 |
| Taxpayer facts populated by inference | 0 |
| Flyway history records changed | 0 |

Before/after row counts and content fingerprints matched for all of these tables:

| Preserved table | Rows |
| --- | ---: |
| `ryczalt_calculation` | 422 |
| `ryczalt_obligation` | 63 |
| `ryczalt_payment_match` | 68 |
| `ryczalt_native_month_input` | 24 |
| `ryczalt_period` | 27 |
| `flyway_schema_history` | 3 |

The SQL introduces no persistent schema changes and does not insert FX rate or
resolution records. The 29 snapshots use historical observations verified from
NBP, not an arbitrary latest row in the existing rate table.

## Required source facts and follow-up

Both current profiles now have user-confirmed accounting start dates and five
zero opening balances on their respective existing start-month rows. This later
operation updated two native-month rows and inserted two `ACCOUNTING_OPENING_SET`
audit events. It did not fill monthly paid contribution amounts or change ZUS
settings. The actual dates remain in the database audit records rather than
being copied into repository documentation.

The update used the following SQL for each user-confirmed target (parameters shown
in place of profile-specific values):

```sql
UPDATE ryczalt.ryczalt_native_month_input
SET accounting_start_date = :start_date,
    opening_ytd_revenue = 0,
    opening_social_contributions_paid = 0,
    opening_health_contributions_paid = 0,
    opening_deductions_consumed = 0,
    opening_vat_carry_forward = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE profile_id = :profile_id AND tax_year = :year AND tax_month = :month
  AND accounting_start_date IS NULL
RETURNING profile_id, accounting_start_date;
```

The source now accepts historical opening states from 2025 as well as 2026.
For 2026 calculations with an earlier accounting start, the revenue and paid-social
YTD aggregation begins in January 2026 and excludes 2025 facts. The existing 2026
calculation-year restriction remains in place. A regression test covers this
boundary; these application changes still require deployment.

Enter actual social and health contributions paid for each managed month,
including explicit confirmed zeros. The date and opening columns are
intentionally empty on other months; they are not required on every input row.
Historical 2025 input rows are retained.

Review the three remaining foreign invoices against source records. The approved
invoice's booked amount was preserved despite a failed rate match; this is a
review requirement, not permission to replace its amount. The two existing
`NEEDS_REVIEW` invoices remain unapproved and without invented booked values.
Recalculate affected months only after the actual taxpayer facts and invoice
reviews have been completed. Deploy the backend and customer web changes together
before using the new form. Runtime deployment and physical-device behavior are
not established by the source tests.

## Validation

Final reports: 182 backend unit tests, 27 backend integration tests and 41
customer-web tests passed, with zero failures, errors or skips.

- Full backend: `mvn -q -f apps/backend/pom.xml verify` passed, including fresh
  canonical schema creation, application persistence integration tests and the
  verified FX maintenance integration test.
- Focused backend regression runs after the final issue/error changes cover
  required input validation, profile-scoped reads, invalidation, explicit zero,
  missing setup, actionable 400/409 errors, review warnings and FX outcome counts.
- Customer web: `mvn -q -f apps/customer-web/pom.xml test` passed; focused form and
  HTTP client tests were rerun after the final template change. These include
  rendered blank values, CSRF, explicit zero submission and retained backend
  validation messages.
- The SQL integration test verifies amount mismatch, unapproved invoices,
  incomplete pre-existing snapshots, cross-profile target mismatch, frozen
  periods, preserved non-FX invoice facts and idempotent audit insertion.
- A final full-suite rerun exposed a disposable-test-database cleanup race:
  the application pool could reconnect between `pg_terminate_backend` and
  `DROP DATABASE`. Test-container cleanup now uses one atomic
  `DROP DATABASE ... WITH (FORCE)` statement; this helper connects only to the
  test container. The full suite was rerun after the fix.
- `git diff --check` passed.

### Month selected for an NBP refresh

The month-end cron remains unchanged. Each execution uses its configured timezone
and refreshes the current month only when its last calendar day has arrived.
An earlier forced or catch-up execution refreshes the previous month instead.
This keeps the requested end date out of the future, including January/year
boundaries and leap years. The start log records both the run date and selected
month. Genuine provider errors still mark the job failed; they are not hidden
by a retry with guessed rates.
