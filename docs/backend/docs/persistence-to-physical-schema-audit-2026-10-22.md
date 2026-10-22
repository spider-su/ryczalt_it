# K3s persistence-to-physical-schema audit

Audit date: 2026-10-22. Target: K3s PostgreSQL database `ryczalt_it`, schema
`ryczalt`, namespace `ryczalt-it-prod` (the unreleased development instance).
All live queries ran in read-only transactions. No K3s data or schema was changed.
The checked-out source was `develop` at `9ce35332f15df89ee486602e25f86ab41498ee40`,
before this audit's changes. The live database was at Flyway `01.027`.

## Schema comparison

The K3s schema-only dump was compared with a fresh PostgreSQL schema migrated
from the checked-out Flyway chain through `01.027`. After removing dump headers
and generated restrict tokens, the diff was empty (`schema_catalog_diff_lines=0`;
2,103 lines on each side). This compares physical tables and columns, PostgreSQL
types, nullability, defaults, primary/foreign/unique/check constraints, indexes,
and triggers. PostgreSQL reported 16.15 on K3s. All declared constraints were
validated; all indexes were ready and valid. The public schema had no application
tables. The comparison is exact for the deployed revision, not for the new
`01.028` migration in this branch.

## Table and persistence path inventory

The 26 application tables and 16 JPA entities were traced to their persistence
paths. `RyczaltEntity` is a mapped superclass. Tables without a JPA entity are
intentionally accessed through JDBC, the security/user store, or the accounting
REST reader; absence of a JPA mapping is not evidence of dead storage.

| Physical tables | Mapping and actual access path | Data/history decision |
| --- | --- | --- |
| `app_users`, `portfolios`, `profile_memberships`, `app_user_invitations` | User/profile security and membership repositories/services; invite flow uses invitation persistence. | Retain identity and authorization records. |
| `integration_instances`, `integration_secrets`, `integration_jobs` | `IntegrationInstanceEntity` / `IntegrationSecretEntity` / `IntegrationJobEntity`; integrations management services and `RyczaltKsefJobScheduler` query enabled `sync-invoices` jobs. | Retain operational state and secrets; scheduler persists run state in jobs. |
| `ryczalt_profile` | Profile configuration JDBC/service path; canonical taxpayer and payment preferences. | Retain canonical profile fields. |
| `ryczalt_period` | `RyczaltPeriodEntity`, `RyczaltPeriodJpaRepository`; accounting, lifecycle, settlement and mobile-readiness services. | Retain profile/month and lifecycle boundary. |
| `ryczalt_invoice`, `ryczalt_counterparty`, `ryczalt_counterparty_rule`, `ryczalt_invoice_candidate` | Corresponding JPA entities/repositories; invoice read/import/classification services and KSeF/bank ingestion. | Candidates are active even when empty; provenance and approval are distinct from canonical invoices. |
| `ryczalt_transaction` | `RyczaltTransactionEntity` / repository; bank-import and settlement services. | Retain source transactions and allocation inputs. |
| `ryczalt_calculation` | `RyczaltCalculationEntity` / repository; calculation persistence adapter and period lifecycle/readiness services. | 422 rows are calculation revision/audit history; retain. |
| `ryczalt_obligation`, `ryczalt_payment_match` | `RyczaltObligationEntity` / `RyczaltPaymentMatchEntity`; settlement writes and `RyczaltPaymentQueryService` reads. | Retain allocations and history. Full allocations that exceed the obligation are valid overpayment evidence. |
| `ryczalt_native_month_input` | `RyczaltNativeMonthInputEntity` / repository; native-month input and calculation services. | Retain monthly facts and opening-state data. |
| `ryczalt_fx_rate`, `ryczalt_fx_resolution` | `RyczaltFxRateEntity` / `RyczaltFxResolutionEntity`; FX acquisition/resolution services use exact-date and native upsert/read paths. | Keep both rate facts and resolution history. |
| `ryczalt_source_reference` | `RyczaltSourceReferenceEntity` / repository; bank/KSeF import, invoice/calculation/obligation/transaction provenance reads. | 355 rows are used provenance, not obsolete compatibility data. Its polymorphic entity ID intentionally has no global FK. |
| `ryczalt_payment_account_rule` | `JdbcRyczaltPaymentAccountRulesReader` called by `RyczaltPaymentAccountResolver` and settlement; aggregate SQL selects one account per profile/type. | Six rows; no profile/type has multiple rows, so current `ORDER BY id LIMIT 1` has no ambiguous live case. |
| `ryczalt_obligation_reference` | `RyczaltObligationReferenceReader` called by `RyczaltAccountingRestController`. | 65 active reference rows; retain. |
| `ryczalt_audit_event`, `ryczalt_correction` | `JdbcRyczaltAuditEventWriter` called from lifecycle/readiness and `JdbcRyczaltCorrectionWriter` for correction history. | 24 audit rows and zero corrections; preserve audit functionality and empty active schema. |
| `flyway_schema_history` | Flyway runtime. | 12 migration records; retain. |

The JPA/native repository query paths inspected include profile/month period
queries; scoped invoice/counterparty and candidate queries; current and revision
calculation reads; payment allocation sums keyed by profile plus obligation or
transaction; FX exact-date reads and `ON CONFLICT DO NOTHING` inserts; and FX
resolution upserts. Custom JDBC paths are the audit/correction writers, payment
account reader, obligation-reference reader, mobile readiness query, and bank
ZUS payment-source query. Their callers are production application services or
the accounting controller. No unused native SQL statement was found.

## Findings

| File and line | Table and column | Evidence of actual usage | Severity | Minimal fix | Data impact |
| --- | --- | --- | --- | --- | --- |
| `apps/backend/src/main/java/com/smartbox/investory/ryczalt/domain/ObligationStatus.java:12-21`; callers: `.../settlement/SettlementService.java:231-245`, `.../application/query/RyczaltPaymentQueryService.java:93-109` | `ryczalt_obligation.status`, `amount`, `manual_paid_date`; `ryczalt_payment_match.matched_amount` | On K3s, 1 of 26 rows stored as `PAID` has payment evidence greater than its obligation. The API derives `OVERPAID` from those same amounts. Existing 10 overallocated obligations include 9 correctly stored `OVERPAID` and this 1 stale `PAID`; over-allocation is supported and is not itself a defect. | P2 data consistency | Centralize read/write classification in `ObligationStatus.fromPayments`, giving positive overpayment precedence over tolerance. Flyway `01.028` changes only persisted `PAID` rows whose effective payments exceed amount. | Current K3s preview count: 1. Migration alters only the status and `updated_at` of qualifying rows; no allocation, amount, invoice, tax calculation, or historical revision changes. Not applied to K3s. |
| `apps/backend/src/main/java/com/smartbox/investory/ryczalt/application/query/RyczaltAccountingQueryService.java:168-184`; test: `.../application/query/RyczaltAccountingQueryServiceTest.java:94-117` | `ryczalt_calculation.calculation_type/result_json` (`VAT.explicitAdjustments`, `VAT.outputVat`, `RYCZALT.revenue`) | The read model used obsolete JSON names and fell back to zero or invoice/obligation summaries. K3s has 20 current VAT calculations using the serializer's `explicitAdjustments` key; 2 contain nonzero adjustments that the old audit response silently returned as zero. All 20 current VAT rows use `outputVat`; all 21 current ryczałt rows use `revenue`. | P2 inaccurate audit response | Read the result-record field names directly, remove the stale aliases and summary fallbacks, and assert mapping from the persisted result shape. | No stored rows changed. Two current period audit responses now expose persisted VAT adjustments instead of zero; result JSON, calculations, tax amounts, and obligations remain unchanged. |
| `apps/backend/src/main/java/com/smartbox/investory/ryczalt/application/ksef/RyczaltKsefImportService.java:124-128` | Polymorphic `ryczalt_source_reference.profile_id/entity_type/entity_id`; target `ryczalt_invoice.id/profile_id` | Reimport looks up an invoice from profile-filtered KSeF provenance but previously fetched the target invoice by global ID only. The source-reference table has no FK for its polymorphic target. Current orphan/cross-profile count is 0, so this is a latent isolation gap, not a reported live corrupt row. | P2 isolation | Resolve with existing `findByIdAndProfileId` query. | No current rows change; corrupted cross-profile provenance now fails closed instead of mutating another profile's invoice. |
| `apps/backend/src/main/java/com/smartbox/investory/ryczalt/persistence/RyczaltCalculationJpaRepository.java:9` (removed); `.../RyczaltFxRateJpaRepository.java:16` (removed); `.../RyczaltPaymentMatchJpaRepository.java:14` (removed); `.../RyczaltNativeMonthInputJpaRepository.java:20` (removed); `apps/backend/src/main/java/com/smartbox/investory/integrations/management/persistence/IntegrationInstanceRepository.java:12` (removed) | Calculation, FX rate, payment match, native-month input, integration instance tables | Repository method-name searches across all main and test Java found no callers for the removed methods. Active alternatives remain: current/revision calculations; FX exact-date read/upsert; payment sums/by-obligation and pair lookup; native-month opening/latest-state reads; integration job scheduling queries `IntegrationJobRepository`. | P3 dead code | Remove the five unreferenced derived repository methods. | No schema/data/API effect. |
| `apps/backend/src/main/java/com/smartbox/investory/ryczalt/application/query/RyczaltInvoiceQueryService.java:78-87` | `ryczalt_source_reference` | The service constructor requires the repository and production caller supplies it; its nullable branch had no legitimate runtime path. | P3 compatibility workaround | Remove the null fallback and call the required repository directly. | No schema/data/API effect. |

No duplicated current calculation write path, obsolete accounting table read,
ignored database exception, or in-memory repair of profile/period foreign-key
inconsistencies was confirmed. The query's former VAT JSON alias fallbacks were
verified against persisted keys and removed. `otherDeduction` remains zero by
the existing query contract, but there is no such field in the persisted
ryczałt result model; its intended decomposition from `deductionsUsed` is
undefined, so the audit did not invent a new accounting interpretation.
Calculation revision rows, audit events, source references, payment matches,
and obligation references are retained history or active features, not dead
code.

## Live data checks

All checks were read-only. Table row counts (the 26 application tables, then
Flyway history) were: invitations 0, users 2, history 12, integration instances
7, jobs 1, secrets 5, portfolios 2, memberships 2, audit events 24, calculations
422, corrections 0, counterparties 25, counterparty rules 11, FX rates 22, FX
resolutions 0, invoices 148, invoice candidates 0, native month inputs 24,
obligations 63, obligation references 65, payment-account rules 6, payment
matches 68, periods 27, profiles 2, source references 355, transactions 167.
Total: 1,460 rows including 12 Flyway-history rows.

| Check | Affected rows/groups |
| --- | ---: |
| Unvalidated constraints / invalid or unready indexes | 0 / 0 |
| Invoice, transaction, calculation, obligation period/profile mismatch | 0 each |
| Obligation-to-calculation profile/period/type mismatch | 0 |
| Invoice/candidate/counterparty-rule profile mismatch | 0 each |
| Payment-match profile mismatch; cross-profile/orphan invoice source reference | 0 / 0 |
| Correction source/target and audit-event period/profile mismatch | 0 each |
| Duplicate profile/month, native month, calculation revision/current key, payment pair, integration-job key | 0 each |
| Transaction allocations above absolute transaction amount; invalid match source | 0 / 0 |
| Manual invoice-paid status without date or on non-cost invoice; consumed-unapproved candidate | 0 each |
| Obligation allocations above amount | 10; 9 status `OVERPAID`, 1 stored `PAID` |
| Payment-account profile/type groups with multiple rows | 0 (6 groups, max 1 row/group) |
| Current VAT calculation JSON rows with nonzero `explicitAdjustments` omitted by the old audit lookup | 2 of 20 |

Persisted enum-like values matched the application/domain set: roles ADMIN and
PROFILE_OWNER; native ZUS regime JDG; invoice methods COUNTERPARTY_RULE,
KSEF_TRUSTED, MANUAL, plus 10 null (nullable by design); source-reference entity
types CALCULATION, INVOICE, OBLIGATION, TRANSACTION; reference obligation types
RYCZALT, VAT, VAT_UE, ZUS. No invalid enum value was found. `VAT_UE` is retained
historical/reference data.

## Exact live SQL for the data finding

This query returned `affected_rows = 1` on 2026-10-22. It does not return row IDs
or accounting values:

```sql
SELECT count(*) AS affected_rows
FROM ryczalt.ryczalt_obligation o
WHERE o.status = 'PAID'
  AND COALESCE((
      SELECT SUM(m.matched_amount)
      FROM ryczalt.ryczalt_payment_match m
      WHERE m.profile_id = o.profile_id
        AND m.obligation_id = o.id
  ), 0)
  + CASE WHEN o.manual_paid_date IS NOT NULL THEN o.amount ELSE 0 END > o.amount;
```

Migration `01.028` contains the exact update SQL. It uses this predicate and
changes `status` to `OVERPAID`, updating `updated_at`. The current live count is
1; future count may differ when applied after review/deployment.

This aggregate query returned `affected_rows = 2` for the former audit-response
fallback defect:

```sql
SELECT count(*) AS affected_rows
FROM ryczalt.ryczalt_calculation
WHERE calculation_type = 'VAT'
  AND is_current
  AND result_json ? 'explicitAdjustments'
  AND (result_json->>'explicitAdjustments')::numeric <> 0;
```

## Changes and verification

- Removed the five unused repository methods and invoice-query null workaround.
- Removed the unused native-month `findLatestBefore` method (five dead methods total).
- Scoped KSeF reimport invoice lookup to the active profile.
- Aligned audit JSON reads with the persisted calculation record field names and
  added an assertion for nonzero explicit VAT adjustments.
- Added `01.028__reconcile_overpaid_obligation_status.sql` and corrected status
  precedence for positive overpayment.
- Fresh-schema and upgrade integration tests passed. The new migration test
  seeds a `PAID` obligation with a larger allocation, upgrades from `01.027`,
  and verifies the allocation is unchanged while the status becomes `OVERPAID`.
- Test command: `mvn -B -Dinvestory.test.database.cleanup=false verify` (isolated Testcontainers PostgreSQL; database cleanup disabled to avoid the smoke test's Spring-context shutdown race during `DROP DATABASE`).
- Result: BUILD SUCCESS; all 26 integration tests passed, 0 failed; all unit
  tests run in that Maven invocation passed.

K3s remains at `01.027` with its existing immutable deployment. Applying
`01.028` requires the ordinary reviewed release/deployment path.
