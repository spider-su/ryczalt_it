# Ryczałt IT release-readiness audit — 2026-09-27

## Decision

**Not release ready.** The backend's database-backed monthly calculation and settlement path is covered and passed locally. The deployed web application could not be authenticated with the supplied test account, its login failure redirected from HTTPS to HTTP, the Android artifact could not be built on this machine because the Android SDK is absent, and the mobile client calls onboarding/readiness endpoints that are not implemented in this backend checkout. A real end-to-end run across all three clients therefore remains unproven.

The next PR should be a **focused repair/integration PR**, not general reliability/security hardening. First reconcile the mobile/backend onboarding and readiness contract and deploy the forwarded-header fix; then repeat authenticated web and Android workflow validation. Expand hardening only after those paths work against a known test environment.

## Scope and method

- Reviewed the current working tree and existing mobile UX/correctness changes before running validation.
- Ran backend unit/integration tests against disposable Testcontainers PostgreSQL, customer-web tests, and the mobile CI script.
- Used the existing `RyczaltNativeBankImportIT` monthly JDG workflow as the persisted backend path: calculate ryczałt/VAT/ZUS, create obligations, import matching bank payments, and assert persisted settlement.
- Attempted one read-only login at the deployed accounting URL using the supplied test account. Login failed; no further attempts were made to avoid account lockout.
- No live accounting records were changed. No deployment or Android publishing was performed.

## Confirmed finding and repair

### Unpaid small obligation could be presented as fully settled

`RyczaltPaymentQueryService` applied the configured PLN tolerance to the outstanding amount even when no payment had been recorded. For example, a PLN 0.04 obligation with zero payment and a PLN 0.05 tolerance produced `status=OPEN` alongside `outstandingAmount=0`. That contradictory API response could be read by clients as paid/settled.

The read model now applies tolerance only after positive payment evidence exists. Regression tests cover both sides: an unpaid PLN 0.04 obligation remains open with PLN 0.04 due, while a PLN 100.00 payment against PLN 100.04 remains accepted as paid under a PLN 0.05 tolerance.

## Monthly workflow evidence

The backend integration test `RyczaltNativeBankImportIT.newMonthCalculatesAllTaxesCreatesObligationsAndSettlesBankPayments` calculates September 2026 from supplied monthly inputs, checks all three persisted calculation rows and their calculated/current state, verifies the period is `CALCULATED`, checks the persisted RYCZALT/VAT/ZUS obligations against calculation outputs, imports three matching bank entries, and verifies three payment matches and three `PAID` obligations. This validates calculation-to-persistence-to-settlement inside the backend using a disposable database; it does not prove that the live web or Android clients complete the same workflow.

## Cross-layer findings

| Area | Evidence | Readiness |
| --- | --- | --- |
| Backend financial calculation and persisted state | Monthly integration test described above; native API/OpenAPI tests cover routes and serialized money/status contracts. | Passed locally after the tolerance fix; backend full `verify` result is recorded below. |
| Web accounting contract/layout | Customer-web tests exercise canonical backend mapping and HTML rendering. Live accounting URL redirected to login; submitted credentials were rejected with generic login error. | Automated contract/render checks pass; deployed authenticated layout and numbers remain unverified. |
| Web HTTPS/session behavior | The deployed login POST response redirected to `http://…/login?error` despite the HTTPS entry URL. Local customer-web configuration uses `server.forward-headers-strategy: framework`, with a smoke test for forwarded HTTPS. | Deployment/runtime configuration must be checked and the corrected build deployed before release. The live login failure cause is unknown; do not infer the supplied credentials are invalid. |
| Android API contract | `apps/mobile/src/api/onboardingApi.ts` calls `/api/profiles/{id}/onboarding`, `/accounting/readiness`, and `/periods/{month}/activity-confirmation`. No controller for these routes exists in this backend checkout. The canonical accounting period, obligations, calculation, and import routes do exist. | First-use/readiness flow cannot be proven against this backend API; resolve contract ownership before release. This audit did not add endpoints or expand POC scope. |
| Android build and device UX | `npm run ci` passes, but the prior `./gradlew assembleDebug` attempt stops because no Android SDK or `sdk.dir` is configured. | Source/type/unit evidence only. No APK, emulator, or physical-device claim. |
| Authentication and profile scope | Backend/web tests cover login/session/profile binding and API tests assert profile-scoped repository use. Live login was unsuccessful, and no authenticated mobile session was available for a full path. | Code-level tests pass; deployed authentication and end-to-end profile isolation were not demonstrated this run. |
| User-facing accounting statuses | Existing mobile tests exercise presentation state; the backend tolerance contradiction is repaired and regression-covered. | Local tests pass. Live web/mobile status parity remains unverified. |

## Validation results

- `mvn -f apps/backend/pom.xml -Dtest=RyczaltPaymentQueryServiceTest test`: **2 passed**.
- `DOCKER_HOST=unix:///Users/alex/.colima/default/docker.sock TESTCONTAINERS_RYUK_DISABLED=true mvn -f apps/backend/pom.xml verify`: **BUILD SUCCESS**; 108 unit tests and 23 Testcontainers/Failsafe integration tests passed with no failures/errors/skips.
- `mvn -f apps/customer-web/pom.xml test`: **37 passed, 0 failures/errors/skips**.
- `npm run ci` in `apps/mobile`: **24 test files, 101 tests passed**; typecheck and formatting passed. ESLint reports 8 existing warnings in files untouched by this work.
- `git diff --check`: clean at audit start; rerun before completion.
- Android Gradle build: unavailable because Android SDK is not configured on this machine.
- Live authenticated workflow: blocked at login; no accounting mutations were attempted.

## Release gates

1. Align the mobile onboarding/readiness client with implemented backend routes (or provide and verify the owning API); preserve the backend as source of truth for profile configuration and readiness.
2. Deploy the current forwarded-header configuration and confirm HTTPS redirects/cookies on the deployed web app.
3. Run an authenticated disposable-profile month through calculation, obligations, bank matching, status display, and persisted-state reload in web and Android.
4. Build/install the Android app on an emulator or device and inspect narrow-screen accounting layout and status parity with the same fixture.

Until those gates pass, this is a tested code-level repair with partial backend workflow evidence, not a release sign-off.
