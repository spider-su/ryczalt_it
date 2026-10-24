# Ryczałt roadmap

This roadmap distinguishes repository foundations, current partial capabilities,
and controlled-POC blockers. “Present in source” is not the same as accepted in a
deployed end-to-end flow. POC entry gates are authoritative in
[`poc-scope.md`](poc-scope.md). The [implementation baseline](implementation-baseline.md)
records source-supported features and explicit product boundaries.

| Stage | Status | Scope / exit evidence |
|---|---|---|
| 0. Standalone product foundation | **Complete in repository** | Separate Ryczałt repository, application boundaries, backend-owned accounting and persistence; source extraction/cutover evidence remains in migration docs. |
| 1. Build and image pipeline | **Implemented; deployment evidence required per environment** | App-specific CI, backend and customer-web Docker publishing, immutable SHA tags, Trivy and SBOM steps. CI/image publication does not prove runtime deployment, rollback, or real-user readiness. |
| 2. Supported monthly calculations | **Implemented in source; deployed acceptance pending** | Native PIT/VAT/ZUS path and unit coverage exist. Native calculation now requires explicit opening-state facts and rejects missing/stale prior VAT results; unit-level source behavior confirmed. Database-backed and deployed mid-year acceptance remain required. |
| 3. Account access and current client surfaces | **Partial** | Backend invitations and acceptance, mobile login/invitation acceptance, and profile-bound customer web exist. No public self-registration or NIP-based setup wizard. Validate complete invite-to-accounting journey in deployed environments. |
| 4. POC accounting completeness and acceptance | **Required before POC** | Explicit start date/opening balances, fail-closed missing inputs, correct due/paid semantics, supported-config rejection, realistic cross-client E2E, deployment/operations evidence. See POC scope. |
| 5. POC deployment and controlled-user operation | **Required before POC** | Deploy verified Docker digests for backend/web; explicit mobile API URL; health/readiness, backups, rollback, support, and a recorded acceptance run with a controlled cohort. |
| 6. Expanded customer workspace | **Partial / continue after POC gates** | Current Thymeleaf workspace is a migration seed and includes implemented profile-bound/accounting views. Do not claim every advanced setting, export, or document workflow is complete; track each against shipped behavior. |
| 7. Backoffice and collaboration | **Deferred** | Full staff review queues, reviewer tooling, multiuser productization and broader accountant collaboration. |

## Automated monthly flow (implemented in source)

- **Tax rules are data.** ZUS, ryczałt and VAT parameters live in
  `ryczalt_tax_rule_set`, one row per type and `effective_from` month. A rule set
  applies until a newer one of the same type starts (2026-01 rules keep applying
  in 2027 until, say, a 2027-04 set is added). Months before the first set fail
  closed. Seeded: 2025-01 and 2026-01.
- **Months open themselves.** A daily job (`app.ryczalt.month-rollover.cron`,
  only with `app.scheduling.enabled=true`) creates the new period and copies the
  employment/insurance settings (JDG active, qualifying UoP, ZUS regime,
  voluntary sickness) from the previous month. Paid amounts stay empty: paid
  health assumes calculated health; paid social needs an explicit fact.
  Per-month corrections start at zero.
- **Every change recalculates.** Invoice approval, KSeF import, a settings
  change and a no-revenue confirmation recalculate from the changed month up to
  the current month, including months never calculated. The chain stops at the
  first month that cannot be calculated and records `AUTO_CALCULATION_BLOCKED`
  with the reason.
- **Settings changes carry forward.** Changing e.g. qualifying UoP in a month
  updates the following months that still had the old settings, stopping at the
  first month with its own different settings.
- **Paying completes the month.** When RYCZALT, VAT and ZUS obligations are all
  paid (bank match or manual confirmation; a zero obligation counts as paid) and
  the calculations are current, the month is frozen automatically. Frozen months
  are immutable; KSeF invoices dated in a frozen month are skipped (counted as
  failed) instead of failing the whole sync, until the month is reopened.
- **Previous-year revenue.** `GET /api/profiles/{id}/accounting/revenue-forecast/{year}`
  returns the previous year's revenue from history (opening YTD revenue plus
  approved income) when history covers that year, otherwise a declared value
  (`PUT`, rejected when history exists), and the forecast health band for the
  year. The monthly calculation still uses actual year-to-date revenue.

## Parked improvements

- **Review the monthly-input carry-forward design.** Settings are copied from
  the previous month and propagated forward on change. Review better
  alternatives, for example a profile-level, effective-dated employment status
  (start/end dates) from which every month derives. The customer-web form still
  requires an explicit choice each month.
- **Late invoices for completed months.** They are skipped today; add a
  correction flow (reopen with review, or book into the open month) instead.
- **Profile columns not yet used by the backend:** `has_uop`,
  `auto_approve_known_counterparties` and the three payment accounts on
  `ryczalt_profile`. Payment matching uses `ryczalt_payment_account_rule` and
  UoP is a monthly setting; wire or remove them.
- **Derive paid ZUS amounts from settlement.** Missing paid health assumes the
  calculated health contribution was paid; explicit overrides, including zero,
  take precedence. Paid social still requires an explicit monthly fact. Replace
  the paid-health simplification with amounts taken
  from matched/confirmed ZUS payments, and confirm with an accountant whether
  the deduction belongs to the contribution month or the payment month.

## Post-POC expansion (deferred)

- JPK_V7M generation/submission, PIT-28, and full annual health settlement.
- KSeF issuance/FA(3), bank API/MT940, and full reconciliation automation.
- More tax rates/forms, quarterly periods, VAT-exempt users, other legal forms,
  and additional ZUS regimes.
- Full backoffice, advanced self-service onboarding, broad multiuser support,
  and full accounting-system replacement.

Do not promote deferred work to supported based on UI placeholders, old
Investory documents, or an integration adapter alone. It requires explicit
scope, backend support, tests, and release evidence.
