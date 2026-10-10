# Ryczałt KSeF scheduled sync

The backend uses the Investory integration-job pattern: a Spring scheduler polls
persisted `ryczalt.integration_jobs` records every minute, checks the record's
cron and timezone, and runs due jobs under a PostgreSQL advisory lock. Each
execution records `STARTED`, then `SUCCESS` or `FAILED`, completion time, and a
short error message. Scheduling is active only when `APP_SCHEDULING_ENABLED=true`.

The `sync-invoices` job defaults to `0 0 2 * * *` in `Europe/Warsaw` and is
created for the global KSeF integration by migration and on subsequent saves.
An enabled job with no completion record runs at the first poll, then follows
the cron from its completion time.
It runs only when both the job and integration instance are enabled. It syncs
sales and purchase invoices for the current and previous issue months. Existing
invoice deduplication remains in the KSeF import service. A failed month or
rejected invoice does not skip the other months or profiles; the overall job is
marked failed. An incomplete KSeF metadata page or exhausted pagination limit
also fails the sync instead of reporting a partial success.

The production Cloud Run backend must have a minimum of one instance and CPU
available outside requests for the in-process scheduler to run. Local backends
leave scheduling disabled by default, avoiding duplicate runs against a shared
database.

Inspect job state in `ryczalt.integration_jobs` or the backend logs:

```sql
SELECT j.id, j.enabled, j.cron, j.timezone,
       j.last_started_at, j.last_completed_at, j.last_status, j.last_error
FROM ryczalt.integration_jobs AS j
WHERE j.job_type = 'sync-invoices';
```

Changing `enabled`, the six-field Spring cron, or `timezone` in the row takes
effect at the next poll. A failed run is retried at the next scheduled time;
check `last_status` and backend logs after that run.
