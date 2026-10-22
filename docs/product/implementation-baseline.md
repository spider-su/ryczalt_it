# Current implementation baseline (source review, 2026-10-22)

This is an implementation-first inventory for the controlled Ryczałt IT POC. **Implemented** means a canonical endpoint/contract and corresponding backend behavior exist on `develop`; it does not imply deployed acceptance. The supported accounting configuration is **2026, JDG, 12% ryczałt, active monthly VAT, monthly PIT and supported JDG ZUS**. See [roadmap](roadmap.md), [POC gates](poc-scope.md), and [canonical REST contract](../backend/docs/rest-api.md).

| Area | Current capability | Boundary / evidence |
| --- | --- | --- |
| Identity | Backend-provisioned invitations and acceptance, authenticated profile-scoped access | No public registration or automatic NIP-based setup; see [onboarding](onboarding.md) |
| Accounting inputs | Accounting start date, explicit opening YTD revenue/contributions/deductions/VAT carry-forward, monthly paid-contribution facts | Canonical input-settings endpoint and validation path; zero must be entered explicitly where applicable |
| Monthly calculation | Native ryczałt, VAT and ZUS calculations; current results, obligations, settlement | Canonical calculate endpoint and persisted-result path; only supported 2026 configuration |
| Historical dependencies | Previous current VAT and ryczałt calculation results required; missing/stale/malformed carry-forwards rejected | Validation rejects missing prior VAT carry-forward evidence; no assumed zero |
| Period lifecycle | List/detail, calculate, freeze and reopen; persisted payment and obligation history | `RyczaltAccountingRestController` and canonical REST contract |
| Readiness | Backend-derived accounting readiness and explicit audited `NO_REVENUE` declaration | Canonical readiness and activity-confirmation endpoints; no-revenue confirmation is not inferred |
| Documents | Invoice recognition candidate, approval, classification, duplicate checks, source identity | Native recognition/approval API; uploaded source amounts cannot be overridden by clients |
| Counterparties | Counterparty list/detail, alias, rules CRUD and filtered invoice history | Native profile-scoped REST resources |
| Payments | Manual paid/unpaid commands for eligible cost invoices, bank CSV acquisition and settlement against transactions | Manual confirmation is not bank evidence; no bank API/MT940 support |
| KSeF | Invoice metadata/acquisition sync and persisted in-process scheduler | Optional integration, requires configuration and scheduling; no invoice issuance or external filing |
| Mobile | Authentication plus Home, Documents, Actions, Payments and More navigation; backend-owned accounting facts | `apps/mobile/App.tsx`, `AppNavigator.tsx`; presence of a screen is not proof of each action's E2E readiness |
| Customer web | Spring MVC/Thymeleaf client using canonical backend HTTP accounting API | Independent Docker image; no separate authoritative accounting database |
| CI and images | Backend and customer-web Docker publishing, security scanning/SBOM; mobile local Android build workflow | Publishing is not deployment; environment acceptance remains separate |

## Explicitly not supported in the current POC

- Other tax rates, years or regimes; quarterly VAT, VAT-exempt profiles, other business forms or alternative ZUS schemes.
- JPK_V7M submission, PIT-28 submission, full annual health settlement, KSeF invoice issuance.
- Public self-registration, NIP-based onboarding wizard, full accountant backoffice.
- Bank API / MT940 integration or comprehensive automated reconciliation.

## Before declaring product complete

Verify each mobile and web action against a running backend, permissions, persisted state, and supported error cases. Run database-backed integration and deployed acceptance tests for mid-year opening, previous-period VAT and deduction carry-forwards, contribution facts, freeze/reopen and invoice approval. Confirm runtime KSeF scheduler configuration, release promotion, secrets, backups and rollback. These are **validation gates**, not evidence that the source-level features are absent.

The canonical REST contract lists endpoints, while [calculation rules](../backend/docs/calculation-rules.md) define numeric behavior. Prefer endpoint behavior and test evidence as primary proof; treat class names as secondary traceability only. Do not duplicate endpoint signatures or tax formulas here.
