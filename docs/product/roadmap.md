# Ryczałt roadmap

The roadmap is ordered to stabilize the platform before expanding accounting scope.

## Stage 0 — Product extraction and repository baseline

Status: current foundation.

- separate Ryczałt from Investory
- one product repository
- backend, mobile, customer web and backoffice boundaries
- independent app builds
- standalone accounting persistence
- preserve accounting tests and contracts

Exit criteria:

- no new Ryczałt feature depends on Investory runtime/database
- all current applications build from the Ryczałt repository

## Stage 1 — Build and deployment baseline

Stabilize delivery before feature growth.

- final monorepo paths
- app-specific CI
- immutable SHA-tagged backend/web artifacts
- DEV / STAGING / PROD environment contracts
- empty-schema and upgrade migration tests
- deployment smoke tests
- explicit rollback procedure
- pinned build tooling
- manual production/store promotion

Exit criteria:

- main is always releasable
- failed deployment can be rolled back without rebuilding source

## Stage 2 — Automated customer onboarding

- NIP lookup
- automatic company prefill
- confirm supported JDG / 12% / monthly PIT+VAT profile
- minimal ZUS questions
- optional KSeF
- existing-profile compatibility

Exit criteria:

- supported user reaches Home in minutes with minimal typing

## Stage 3 — First-use readiness

- contextual Home guidance
- accounting completeness states
- distinguish missing data from zero/no activity
- retry/partial-error handling
- clear next actions

Exit criteria:

- a new user understands whether the current period is ready and what to do next

## Stage 4 — Historical accounting bootstrap

- reuse existing Ryczałt data first
- use KSeF/imports where available
- ask only for missing opening values
- track provenance
- avoid false zero assumptions

Exit criteria:

- mid-year starters can produce correct supported calculations

## Stage 5 — Customer web workspace

- detailed accounting dashboard
- full settings
- invoice filters and bulk workflows
- historical data management
- detailed calculation breakdowns
- reports, exports and document management
- KSeF configuration/history

Mobile remains the primary quick-action interface.

## Stage 6 — Backoffice

- reviewer/admin authentication and roles
- business assignments
- review queues
- classification/completeness exceptions
- corrections
- integration/support tooling
- audit trail

## Stage 7 — Payments and reconciliation hardening

- tax micro-account setup
- ZUS payment account
- payment history
- authoritative paid/unpaid/overdue state
- reconciliation and safe manual confirmation
- reminders

## Later expansion

Only after the initial supported profile is stable:

- additional ryczałt rates
- multiple rates
- quarterly periods
- VAT-exempt users
- other taxation methods
- other legal forms
- broader accountant collaboration
- deeper bank automation

Do not expose these as usable accounting modes before backend support and validation are complete.
