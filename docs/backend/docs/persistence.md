# Ryczalt persistence

The standalone backend owns accounting facts in the `ryczalt` schema. This is a
**logical product model**, not a complete physical table/foreign-key diagram.
See [product structure](../../architecture/product-structure.md) for identity ownership,
[implementation baseline](../../product/implementation-baseline.md) for current scope,
and [POC scope](../../product/poc-scope.md) for acceptance boundaries.

```text
app_users (login identity) ── profile ownership / membership ── portfolios (access boundary)
                                                             │
                                                             └── ryczalt_profile (taxpayer facts)
                                                                  │
                                                                  ├── ryczalt_period (one per month)
                                                                  │    ├── ryczalt_native_month_input (settings; opening state on start month)
                                                                  │    ├── ryczalt_invoice ── ryczalt_counterparty
                                                                  │    ├── ryczalt_transaction
                                                                  │    ├── ryczalt_obligation ── ryczalt_payment_match ── transaction
                                                                  │    └── ryczalt_calculation (current result + revisions)
                                                                  └── integration configuration (optional)

Supporting: source references / recognition candidates, counterparty rules,
FX facts, integration instances/secrets/jobs, and audit history.
```

The diagram groups records by **accounting profile and month**; it does not imply
that every listed record has a direct foreign key to `ryczalt_profile` or that
all relationships are one-to-one. Invoice-to-counterparty is optional until
classification, and bank allocations may relate one transaction to multiple
obligations through payment-match rows.

## Product relationships and ownership

- **Identity and profile:** `app_users` authenticates a person; `portfolios` determines
  which accounting profiles they may access; `ryczalt_profile` holds taxpayer
  identity, NIP, payment accounts and accounting preferences. Ownership and
  membership are authorization relationships, not duplicate taxpayer records.
- **Period and opening state:** a profile has one accounting period per managed
  month. The native month-input record holds monthly settings and paid-contribution
  facts; only the configured first month carries the complete opening state.
  Unknown opening amounts must not be inferred as zero.
- **Invoice and counterparty:** recognized source candidates precede canonical
  approved invoices. Canonical invoices belong to a period and may reference a
  reusable counterparty. Counterparty rules help classify future invoices but
  do not replace approval decisions or source facts.
- **Transactions and settlement:** imported bank transactions and calculated tax
  obligations are distinct records. Payment-match allocations link them;
  manually confirmed **cost-invoice** payment is a separate status and is not
  evidence of a matched bank transaction or a tax-obligation settlement.
- **Calculations:** a period has calculation types for ryczałt, VAT and ZUS,
  with one current revision per type and historical results for audit. Obligations
  are generated from calculations, not from raw input rows.
- **Integrations:** KSeF and bank acquisition add source facts into the native
  accounting model. Integration configuration, credentials and scheduled jobs
  are operational records, not a second accounting ledger. KSeF issuance and
  tax filing are outside the POC.
- **Historical compatibility:** retained legacy accounting tables and
  transitional columns are not alternative runtime sources of truth. Removal
  requires a separately reviewed migration and retention decision.

## Cleanup inventory (documentation only)

| Candidate | Current interpretation | Audit result |
| --- | --- | --- |
| `app_users.birth_date` | Transitional identity field; not canonical taxpayer data | Migration `01.027` validates it against profile date of birth, then removes the duplicate |
| `portfolios.taxpayer_*`, `tax_micro_account`, `zus_payment_account` | Legacy/import compatibility; canonical taxpayer and payment facts belong in `ryczalt_profile` | Migration `01.027` checks conflicts, backfills missing canonical profile fields, then removes the duplicate columns |
| `portfolios.owner` | Populated historical display field with no consistent canonical mapping | Keep pending a product meaning and lossless migration rule |
| `ix_ryczalt_obligation_period`, `ix_ryczalt_payment_account_rule_profile` | Redundant with existing unique indexes | Migration `01.027` removes these two indexes only |
| Historical `accounting_*` tables | Retained migration-era data, not active accounting storage | Confirm retention, backups, restore and downstream dependencies; separate cleanup decision |
| `ryczalt_source_reference` and `ryczalt_invoice_candidate` | Active provenance and invoice recognition concepts | Keep |
| `ryczalt_payment_match`, `ryczalt_calculation` revisions | Active settlement and audit history | Keep |
| `ryczalt_native_month_input` | Active monthly and opening-state facts | Keep; do not split solely for normalization |

The read-only code and data audit supporting these decisions is recorded in
[`schema-cleanup-audit.md`](schema-cleanup-audit.md). Migration `01.027` is an upgrade migration;
it does not rewrite historical migrations or remove accounting facts. Applying it to the live
database still requires a verified backup/restore, maintenance window, and separate operator
approval. Do not conflate cost-invoice manual payment confirmation with tax-obligation payment
allocations. See [migration history](migration.md) for archival context.

## Tables and ownership

`ryczalt_period` is one profile-owned `YearMonth` and lifecycle status. Its unique key is
`(profile_id, period_year, period_month)`. Invoices have explicit `INCOME` or `COST` direction;
transactions and obligations point to the period and repeat `profile_id` so repository queries and
database constraints cannot accidentally cross profile boundaries.

`ryczalt_calculation` stores a revision history and one current result per profile, period, and calculation
type (`RYCZALT`, `VAT`, `ZUS`). `result_json` is an explicit JSON document produced by the application,
not Java serialization. `rule_version`, `calculator_version`, `calculated_at`, and
`input_fingerprint` make the stored result auditable. The current calculation path fingerprints semantic inputs and
retains prior revisions when a calculation changes.

`ryczalt_fx_rate` stores provider, currency, date, positive `NUMERIC(19,8)` rate, and fetch time.
`ryczalt_source_reference` preserves the legacy source table and row identity without adding
provider-specific fields to canonical domain objects.

`ryczalt_payment_match` stores positive payment allocations, match type, and creation time. Composite
profile/entity foreign keys prevent an obligation from one profile being matched to a transaction
from another. A unique obligation/transaction pair makes automatic settlement idempotent.

Accounting REST controllers use the Ryczalt application boundary rather than
repositories. Native read models are mapped to canonical response contracts;
legacy snapshots do not enter the domain.

## Precision

Money is stored as `NUMERIC(19,4)`, tax rates as `NUMERIC(7,4)`, and FX rates as `NUMERIC(19,8)`.
Storage precision is not statutory rounding. Stage-2 `RoundingPolicy` remains authoritative for
2-decimal contribution/deduction operations and whole-PLN tax/VAT settlement.

## JPA boundary

JPA entities and repositories live under `persistence`; native query services map them to immutable
read models. Loading does not run calculators. Writes are explicit and do not rely on
aggregate-wide cascade magic.

## Frozen periods

The schema retains calculated and frozen timestamps plus persisted calculation results. Frozen writes
fail at the persistence boundary. Reopening and correction are explicit, reasoned, and audited.
