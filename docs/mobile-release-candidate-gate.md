# Mobile release-candidate gate

## Current run

- Starting SHA for final pre-E2E hardening: `428ae1d008195d30e4cc579382998359ef301f9d`.
- Branch: `develop`, synchronized with `origin/develop` before changes.
- Final native/device verification: not performed in this environment.
- Authenticated API credentials: unavailable in this environment.

## Automated result

- `npm ci`: PASS.
- `npx expo-doctor`: PASS — 21/21 checks.
- `npm run ci`: PASS — 18 test files, 73 tests after final hardening.
- Typecheck: PASS.
- `git diff --check`: PASS.
- `npx expo config --type public`: PASS.
- Web Expo export: PASS.
- Lint: no configured lint script.
- Deployed unauthenticated OpenAPI GET: HTTP 200, valid `.paths` schema, observed latency 0.14s. This is not authenticated accounting validation.

## Configuration result

- App name: `Investory Accounting`.
- Android package: `pl.investory.accounting`.
- iOS bundle identifier: `pl.investory.accounting`.
- Expo SDK: `~57.0.24`.
- Notifications plugin: configured.
- EAS owner/project ID: present in `app.json`.
- `eas.json`: present; development, preview, and production profiles are
  configured and unchanged.
- Android preview build status: prior attempts completed checkout, dependency
  install, CI, EAS authentication, keystore selection, upload, and fingerprint
  generation, then were rejected by the Android monthly build quota.
  Classification: `BUILD_INFRASTRUCTURE_QUOTA`, not an app build failure.

## Gate status

Automated gate: PASS.

Physical release gate: NOT VERIFIED. Required before controlled pilot: current
HEAD native build/install, fresh-install login, real accounting journey,
notification permission/scheduling/tap lifecycle, offline/slow network,
restart, safe-area/keyboard/large-text checks, logout, and account-switch
privacy.

Backend latency status: authenticated accounting latency not measured in this environment. The temporary 180-second mobile timeout remains unchanged.

Server push: deferred; no user-facing device registration/delivery contract exists.
