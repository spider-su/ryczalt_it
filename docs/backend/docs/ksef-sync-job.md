# Ryczałt KSeF scheduled sync

The backend uses the Investory integration-job pattern: a Spring scheduler polls
persisted `ryczalt.integration_jobs` records every minute, checks the record's
cron and timezone, and runs due jobs under a PostgreSQL advisory lock. Each
execution records `STARTED`, then `SUCCESS` or `FAILED`, completion time, and a
short error message. Scheduling is active only when `APP_SCHEDULING_ENABLED=true`.

The `sync-invoices` job defaults to `0 0 2 * * *` in `Europe/Warsaw` and is
created for the global KSeF integration by migration and on subsequent saves.
It runs only when both the job and integration instance are enabled. It syncs
sales and purchase invoices for the current and previous issue months. Existing
invoice deduplication remains in the KSeF import service. A failed month does
not skip the other month; the overall job is marked failed.

The production Cloud Run backend must have a minimum of one instance and CPU
available outside requests for the in-process scheduler to run. Local backends
leave scheduling disabled by default, avoiding duplicate runs against a shared
database.

Inspect job state in `ryczalt.integration_jobs` or the backend logs. Changing
`enabled`, `cron`, or `timezone` in the row takes effect at the next poll.
