---
name: ryczalt-it-emulator-audit
description: Run a repeatable Android emulator audit of the authenticated Investory Accounting app, checking UI layout and backend-sourced accounting values without changing accounting or user settings. Use when asked to audit or repeat Android accounting acceptance checks; not a physical-device or release-store test.
---

# Investory Accounting Android audit

Use the read-only workflow in [references/accounting-audit-plan.md](references/accounting-audit-plan.md). It covers the current mobile screens and backend API boundary for this repository; it is not the separate rental app's regression plan.

Workflow:

1. Confirm repository root, current branch/commit, and dirty state. Preserve all existing changes.
2. Confirm the current checkout's app identity from `apps/mobile/app.json`: package `pl.investory.accounting`, Expo owner `smart-box`, and EAS project ID `8fa28fb6-df62-4889-8e3a-8094de92bd59`. Do not use an APK or emulator configuration from the separate `/Users/alex/projects/ryczalt` checkout.
3. Build an API-mode standalone APK from this checkout with [the APK build skill](../ryczalt-it-build-apk/SKILL.md). Set `EXPO_PUBLIC_API_URL` to the verified HTTPS backend API origin before building. Do not substitute the customer web URL or use mock/demo mode for accounting evidence.
4. Require the dedicated disposable Android 35 AVD and a successful `ro.kernel.qemu=1` check before installing or interacting. Do not clear app data or uninstall the user's existing package; if the install signature conflicts, stop and use a separate disposable AVD.
5. Authenticate once with the dedicated QA account through the normal app flow. Read `RYCZALT_TEST_USERNAME` and `RYCZALT_TEST_PASSWORD` from the environment or secure credential handoff. Never put credentials, tokens, session headers, raw API responses, or identifying accounting data in Git, screenshots intended for public sharing, logs, or the final summary. If login fails, make no repeated attempts; diagnose configuration without changing credentials.
6. Execute every read-only case in the reference plan, saving local evidence and noting skipped/unavailable screens. Do not tap an action that might persist a change.
7. Compare visible financial values and states with the same authenticated profile's canonical backend GET responses when safely available. Record exact decimals/currencies, endpoint and period, and whether each claim was observed or inferred. Do not infer zero, readiness, or paid status from missing, failed, or empty responses.
8. Report pass/fail/blocked for every case with commit, APK SHA-256, emulator/API/display, backend environment label, timestamp, and evidence folder. State clearly that this is emulator evidence only.

The skill's no-write boundary is strict: do not create/edit/delete invoices, mark invoices or obligations paid, change counterparties or rules, upload/import documents, trigger calculation, freeze/reopen periods, or change settings/notification preferences. Search, filter, change the selected month, open details, scroll, and authenticate only.

## Simple build/startup repairs

Do not stop at the first build error when its technical cause is clear and low-risk. Fix an unresolved import, typo, or generated-file issue in the smallest relevant source scope; run the targeted check/build again, then continue the audit if it passes. The APK helper restores missing `node_modules` from the lockfile with `npm ci` and verifies that `expo-clipboard` is a direct dependency matching the lockfile. It does not repair or rewrite dependency manifests. If that check fails, stop and report the manifest repair needed; make any compatible dependency change explicitly outside the normal audit build.

Keep the fix and audit evidence separate: preserve pre-existing work, record changed source files, and add/update a focused regression test when the repair changes application source behavior. Never silence an error, replace live API data with mocks, or alter accounting values/statuses to make the audit pass.

Stop and report the blocker when diagnosis needs a product/accounting decision, financial calculation or status change, authorization/API contract choice, backend URL or credentials, app/EAS identity, signing/versioning decision, external service change, or a repair whose effects are not obvious. Do not run an authenticated review against an unknown backend.
