# Ryczałt roadmap

This roadmap distinguishes repository foundations, current partial capabilities,
and controlled-POC blockers. “Present in source” is not the same as accepted in a
deployed end-to-end flow. POC entry gates are authoritative in
[`poc-scope.md`](poc-scope.md).

| Stage | Status | Scope / exit evidence |
|---|---|---|
| 0. Standalone product foundation | **Complete in repository** | Separate Ryczałt repository, application boundaries, backend-owned accounting and persistence; source extraction/cutover evidence remains in migration docs. |
| 1. Build and image pipeline | **Implemented; deployment evidence required per environment** | App-specific CI, backend and customer-web Docker publishing, immutable SHA tags, Trivy and SBOM steps. CI/image publication does not prove Cloud Run deployment, rollback, or real-user readiness. |
| 2. Supported monthly calculations | **Implemented with known correctness gap** | Native PIT/VAT/ZUS path and unit coverage exist. Missing prior VAT period/current result still falls back to zero; no validated general opening-state contract. Must close before mid-year POC use. |
| 3. Account access and current client surfaces | **Partial** | Backend invitations and acceptance, mobile login/invitation acceptance, and profile-bound customer web exist. No public self-registration or NIP-based setup wizard. Validate complete invite-to-accounting journey in deployed environments. |
| 4. POC accounting completeness and acceptance | **Required before POC** | Explicit start date/opening balances, fail-closed missing inputs, correct due/paid semantics, supported-config rejection, realistic cross-client E2E, deployment/operations evidence. See POC scope. |
| 5. POC deployment and controlled-user operation | **Required before POC** | Deploy verified Docker digests for backend/web; explicit mobile API URL; health/readiness, backups, rollback, support, and a recorded acceptance run with a controlled cohort. |
| 6. Expanded customer workspace | **Partial / continue after POC gates** | Current Thymeleaf workspace is a migration seed and includes implemented profile-bound/accounting views. Do not claim every advanced setting, export, or document workflow is complete; track each against shipped behavior. |
| 7. Backoffice and collaboration | **Deferred** | Full staff review queues, reviewer tooling, multiuser productization and broader accountant collaboration. |

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
