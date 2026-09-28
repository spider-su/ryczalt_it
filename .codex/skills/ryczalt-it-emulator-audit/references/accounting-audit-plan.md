# Read-only Android accounting audit plan

## Purpose and evidence boundary

Review the Android app built from the current `ryczalt_it` checkout against the same authenticated profile's backend accounting data. Inspect screen layout, navigation, month selection, invoice/payment states, and visible financial numbers. This is an evidence-gathering audit, not a data-entry or account-repair workflow.

The mobile app is Expo/React Native. Current project identity is Android package `pl.investory.accounting`, Expo owner `smart-box`, and EAS project ID `8fa28fb6-df62-4889-8e3a-8094de92bd59`. The API base URL is an explicit build-time `EXPO_PUBLIC_API_URL`. API mode is the default; mock/demo responses never count as evidence about the backend account.

## Prerequisites

- A dedicated disposable Android 35 AVD, portrait, preferably 320 × 640 at 160 dpi. Record actual values rather than silently changing emulator-wide configuration.
- A standalone release APK built from the current checkout with API mode and the intended HTTPS backend origin.
- QA credentials supplied through `RYCZALT_TEST_USERNAME` and `RYCZALT_TEST_PASSWORD` or a secure credential handoff. Do not save them in files or the evidence folder.
- A backend environment label (for example, QA or preview). Keep bearer tokens and secret origins out of report text.
- A fresh run folder under `apps/mobile/scripts/tmp/android-accounting-audit/<YYYYMMDD-HHMM>-<short-commit>/`. This path is ignored by Git. Treat screenshots and UI dumps as sensitive local evidence; do not upload or commit them by default.

If the API origin or QA credentials are unavailable, stop before authentication and report the blocker. Never infer the API origin from the customer-web URL. Do not fall back to local mock mode.

When a simple build/startup problem is encountered, inspect the compiler/runtime diagnostic, apply a narrow and unambiguous technical fix, run the targeted validation again, and resume this plan if it passes. Preserve unrelated edits and record the fix. Do not improvise changes to financial logic, statuses, authorization, or backend contracts; stop when those require a decision.

## Safety and setup

1. Record `git rev-parse --short HEAD`, `git status --short`, APK SHA-256, and local timestamp. Keep existing changes intact.
2. Run `adb devices -l`, select the intended device, then verify `adb -s <serial> shell getprop ro.kernel.qemu` returns `1`. If not, stop before installation, account login, or data access.
3. Record `wm size`, `wm density`, Android release/API level, emulator model, and app version. Do not alter system clock, global settings, notification permission, or navigation mode for the standard run.
4. Install only on the dedicated disposable AVD. `adb install -r` may update the same signed package. If the signatures conflict, do not uninstall or clear the existing app; use a different disposable AVD.
5. Never run `pm clear`, reset the app, clear SecureStore, or delete the QA account. If an existing session or local state prevents a clean login check, record it and use a newly provisioned disposable AVD.
6. Create a unique evidence folder and capture screenshots directly with ADB. Keep raw UI hierarchies and API data in that private folder only if needed; sanitize them before any summary.

Example evidence capture:

```sh
mkdir -p "$RUN_DIR"
adb -s "$ADB_SERIAL" exec-out screencap -p > "$RUN_DIR/01-login.png"
adb -s "$ADB_SERIAL" shell uiautomator dump /sdcard/window.xml >/dev/null
adb -s "$ADB_SERIAL" pull /sdcard/window.xml "$RUN_DIR/01-login.xml" >/dev/null
```

## Authentication and startup

1. Launch the installed app and capture the first stable screen.
2. If already authenticated, use the session as found; do not log out merely to force a login screenshot.
3. Otherwise enter the supplied credentials using the app's normal sign-in form. A single authentication attempt is permitted. If it fails, stop; do not retry, activate another account, bypass auth, or alter credentials.
4. Confirm the correct profile is selected from the authenticated identity returned by the app/backend. Do not type or assume a `profileId` to reach a different user's data.
5. Record startup/login state, any loading/error/empty state, and the app-reported profile identity in sanitized form.

## Period and API comparison

1. Use the period requested by the audit task. If none is specified, inspect the app's period list and choose a populated recent period; also inspect one adjacent period if available. Do not create missing data.
2. The mobile app's read paths are defined in `apps/mobile/src/api/accountingPaths.ts`; authentication is `/api/v1/auth/login` and `/api/v1/auth/me`, while profile-scoped accounting reads use `/api/profiles/{profileId}/accounting/...`.
3. Prefer backend GET responses for the same authenticated profile and period as the canonical comparison source. Never call POST/PUT/PATCH/DELETE routes for this audit. Authentication POST is the only permitted non-GET request.
4. Compare fields that are present and authoritative: amounts, currencies, invoice direction and identifiers, due dates, obligation type, paid/outstanding values, backend status/readiness, and counters/period labels. Preserve decimal precision and original currency. Do not sum mixed currencies without an explicitly documented conversion.
5. Distinguish total calculated obligations from outstanding issued payment instructions. A zero/missing field, empty list, partial load, or failed request is not proof of zero liability, paid status, readiness, or no data.
6. If safe access to the backend response is unavailable, compare only what can be established from the UI and current source mapping; label the result “not independently backend-verified”. Do not extract app tokens from SecureStore or print authorization headers.

## Read-only screen cases

Capture a screenshot per available case; add a short sanitized result to `results.md`.

| Case | Screen / checks |
|---|---|
| 01 | Login/startup: title, loading/error presentation, safe areas, keyboard and primary controls. Capture login only if it appears without destroying an existing session. |
| 02–03 | Home: initial and scrolled states; period label; income/expense/tax/payment totals; readiness and status language; unavailable/empty/error handling. Compare exact values with the period API response. |
| 04–06 | Invoices: all, sales, and purchases views where present; counts, date/amount/currency, payment/review labels, filters and search. |
| 07–08 | Open one income and one purchase invoice detail when available. Verify the details agree with their list row and backend record. Do not mark paid or change status. |
| 09–10 | Invoice search and filters. Inspect empty results and reset behavior; do not edit invoice content. |
| 11–12 | Settlements/payments initial and scrolled states; headline total, outstanding amount, due dates, statuses, history, filters, and empty/error copy. |
| 13–16 | Ryczałt, VAT, and ZUS rows/details if present. Record exact status and distinguish obligation totals from remaining-to-pay values. Do not tap payment confirmation or manual-paid actions. |
| 17 | More tab: navigation, profile/company identity in sanitized form, and available sections. |
| 18–20 | Counterparties and details/history/rules where reachable. Inspect only; do not edit aliases or create/update/delete rules. |
| 21–22 | Notification and settings surfaces where available. Observe values and descriptions only; do not toggle permissions/preferences or save changes. |
| 23 | Month selection: change to the requested adjacent period and back; check labels and data update consistently. This selection is local UI navigation and is permitted. |

If a screen or feature is absent, mark it unavailable in this build. Do not invent screens or data to fill gaps.

## Layout and usability checks

- Check content against status and system navigation bars; verify no clipped controls, doubled safe-area gaps, or overlap with the keyboard.
- Check bottom tabs, labels/icons, scroll reachability, title wrapping, monetary alignment, and contrast at the recorded emulator size.
- Check long names, large/negative/unavailable amounts, mixed currencies, no-data results, API loading failures, and status wording where encountered.
- Exercise only read-only navigation: tabs, month selection, search, filters, list scrolling, and opening/closing details.
- If a control may mutate accounting or settings, document it without activating it.

## Accounting invariants to verify

- Same profile, period, currency, invoice, and obligation across UI and API comparisons.
- Income/expense totals reconcile only using the domain's explicit inclusion rules and backend response; do not recompute taxes in the client.
- Obligation total, amount paid, issued payment instructions, and remaining amount are distinct values; don't equate them without API evidence.
- A paid/overdue/ready/complete status must agree with its authoritative backend field and relevant due date/current date.
- Period switching must update every visible dataset consistently; loading/error states must not leave stale values looking current.
- Missing or failed API data remains unknown/unavailable, never presented as a confident zero by audit interpretation.

## Stop conditions

Stop and preserve evidence if the app is pointed at another checkout's Metro server, configured for mock/demo data, connected to an unknown backend, using the wrong profile, showing another user's data, or displaying a write confirmation/action that cannot be safely avoided. Do not submit credentials until the API origin and target environment are verified.

## Results and privacy

Write `results.md` in the private run folder with:

- commit, branch/dirty-state note, APK SHA-256, build type, app version/package;
- emulator serial/model, Android/API, resolution/density, and timestamp;
- backend environment label and whether API origin was verified, without logging secrets;
- per-case pass/fail/blocked/not available, expected versus observed, screenshot path, and source/API evidence;
- confirmed defects separated from limitations/inferences;
- explicit statement that no accounting or settings writes were performed.

Do not include passwords, tokens, authorization headers, raw response bodies, or unnecessary personal/business data. Keep evidence local and ignored by Git. Passing emulator checks do not establish physical-device behavior, store-signing/release readiness, notification delivery, tax/legal correctness, or production backend health.
