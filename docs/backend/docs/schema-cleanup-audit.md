# Database schema cleanup audit

This note records a read-only inspection of the configured production K3s PostgreSQL database and
the bounded cleanup proposed by Flyway migration `01.027`. It contains aggregate counts and schema
facts only; no taxpayer, account, invoice, or credential values are included.

## Inspection findings

- The database was inspected in a read-only repeatable-read transaction. Its application schema was
  at Flyway version `01.026` when inspected.
- The `public` schema had no base tables and no historical `accounting_*` tables were present.
- The `ryczalt` schema had 25 application tables with 1,447 rows, plus 11 Flyway history rows.
  Existing accounting facts are in the native `ryczalt_*` tables.
- All declared constraints were validated. No profile/period mismatches were found in the audited
  invoice, transaction, calculation, obligation, or audit-event references. The polymorphic source
  references audited for invoices, calculations, obligations, and transactions had no orphans.
- Two user birth dates and all nine legacy portfolio taxpayer/payment fields were populated for both
  profiles. The existing canonical profile agreed with its legacy values. One portfolio did not yet
  have a canonical `ryczalt_profile` row; migration `01.027` fills it from that portfolio's legacy
  fields.
- The two birth-date values and 18 populated taxpayer/payment values fit the canonical column
  limits; no truncation is required.
- `portfolios.owner` is populated, but does not consistently match either `taxpayer_full_name` or
  the linked user display name. It is retained pending a defined canonical meaning.
- Two indexes duplicate existing unique indexes: `ix_ryczalt_obligation_period` and
  `ix_ryczalt_payment_account_rule_profile`. Their corresponding unique indexes remain.

## Cleanup decision

Before the migration, the logical ownership is `app_users` for login identity, `portfolios` for
profile access, and `ryczalt_profile` for taxpayer and payment configuration. After `01.027`, that
ownership remains the same, with duplicate taxpayer/payment fields removed from `portfolios` and
the duplicate birth date removed from `app_users`. Accounting facts continue to reference the
portfolio/profile ID as before.

Migration `01.027` performs only these schema/data changes:

1. Check for disagreements between legacy taxpayer/payment values and existing canonical profile
   values. Any disagreement aborts the migration before the legacy columns are removed.
2. Check that every non-null `app_users.birth_date` is represented by the linked portfolio's or
   canonical profile's date of birth. Any mismatch aborts the migration.
3. Upsert the nine legacy portfolio taxpayer/payment fields into `ryczalt_profile`, preserving
   existing canonical values. `tax_micro_account` maps to both the VAT and ryczałt payment-account
   fields, as documented by the current compatibility migration. The migration verifies the copied
   values before dropping their source columns.
4. Drop `app_users.birth_date`, the nine legacy portfolio taxpayer/payment columns, and the two
   redundant indexes.

No accounting facts, periods, source references, obligations, users, portfolios, or canonical
`ryczalt_profile` fields are deleted. `portfolios.owner` is retained. No API, calculation rule,
configuration, or dependency changes are part of this cleanup.

## Keep and review

- Keep `ryczalt_source_reference`: 355 rows were present and code uses it for source provenance.
- Keep `ryczalt_obligation_reference`: 65 rows were present and `RyczaltObligationReferenceReader`
  reads it.
- Keep empty tables that are referenced by active code, including invoice candidates, corrections,
  FX resolution, and invitations. Zero current rows are not evidence that these schemas are dead.
- Keep payment-account rules unchanged. Six rows were present and
  `JdbcRyczaltPaymentAccountRulesReader` reads the table. The overlap with account fields on
  `ryczalt_profile` remains a model/documentation question for a separate review.
- Review the meaning of `portfolios.owner` before any future removal. Its populated values are not
  consistently derivable from another field.
- Review canonical profile fields without current Java consumers separately; documentation and
  current product direction are not sufficient evidence to delete them in this migration.

## Live migration plan

The live database has **not** been changed. Before applying `01.027` to K3s:

1. Confirm the target cluster, namespace, database, and active backend image with the operator.
2. Quiesce application writes and take an encrypted custom-format PostgreSQL backup. Restore that
   backup into an isolated database and verify the restore and pre-migration row/schema counts.
3. Run the migration against the restored copy first. Confirm Flyway `01.027`, the canonical profile
   row count, all accounting table counts, and the absence of the removed columns/indexes.
4. Schedule a maintenance window, quiesce writes again, repeat preflight conflict checks, and apply
   the pinned release containing `01.027`. Run backend smoke checks and verify Flyway history and
   aggregate row counts before restoring traffic.
5. If post-migration verification fails, keep writes stopped and restore the verified backup using
   the approved recovery procedure; do not attempt ad hoc reverse SQL because the dropped columns
   cannot be reconstructed from the migration alone in every possible case.

The live migration is destructive at the schema level. Applying it requires a separate explicit
operator approval after reviewing the target, backup/restore evidence, maintenance window, and
release digest. This PR does not execute that operation.
