# Database schema cleanup audit

This note records a read-only inspection of the deployed K3s PostgreSQL database and the bounded
cleanup implemented by Flyway migration `01.027`. The task owner identified the target as the
unreleased development instance. Its current Kubernetes namespace and Argo CD Application are both
named `ryczalt-it-prod`. This note contains aggregate counts and schema facts only; no taxpayer,
account, invoice, or credential values are included.

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

## Live migration record

After separate operator approval, migration `01.027` was applied to the development instance on
2026-10-22. The verified pre-migration state was Flyway `01.026`, 1,447 application rows across 25
tables, plus 11 Flyway history rows.

- An encrypted custom-format backup was created and restored into a temporary isolated database.
  All 26 source/restored base-table counts matched at Flyway `01.026`.
- Flyway `01.027` was applied to that restored copy first. The current backend started and passed
  its health check against the migrated copy. The temporary restored database was removed after
  verification.
- Before the live migration, the application database role was temporarily disabled and its 10
  existing sessions were terminated. The role was re-enabled after the migration and checks.
- Flyway applied exactly one migration to the live database, to version `01.027`. The 25
  application-table row counts changed only by the expected one new canonical profile row; Flyway
  history gained its expected twelfth row. Invoices (148), source references (355), and every other
  application-table row count remained unchanged.
- Post-migration checks found both canonical profile rows populated, no removed columns, both
  redundant indexes absent, both backing unique indexes present, `portfolios.owner` retained, all
  declared constraints validated, and no audited profile/period mismatches.
- The deployed backend remained on its existing immutable image digest and returned
  `/actuator/health` status `UP` with 1/1 pod ready. No application deployment was performed.
- The encrypted backup and matching age identity remain in the operator's private local recovery
  directory; neither is committed to the repository.

The live migration is destructive at the schema level. The development operation is complete. Any
future migration to a separately managed production target still requires its own explicit
approval, verified backup/restore, maintenance window, and release digest. Do not attempt ad hoc
reverse SQL; use the verified backup recovery procedure if rollback is needed.
