# Mobile release-candidate gate

## Current run

- Starting SHA: `23b00b9f712afe531d3e2fcd08ef0e2334f53e46`
- Branch: `develop`, synchronized with `origin/develop`.
- Authenticated API credentials: unavailable in this environment.
- Android/iOS device or emulator: unavailable.
- EAS CLI and `eas.json`: unavailable/not present.

## Automated result

- `npm run ci`: PASS — 17 test files, 63 tests.
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
- No `eas.json` is present; native preview/release profile validation remains external.

## Gate status

Automated gate: PASS.

Physical release gate: NOT VERIFIED. Required before controlled pilot: authenticated live API smoke, native build/install, fresh-install login, real accounting journey, notification permission/scheduling/tap lifecycle, offline/slow network, restart, safe-area/keyboard/large-text checks, logout, and account-switch privacy.

Backend latency status: authenticated accounting latency not measured in this environment. The temporary 180-second mobile timeout remains unchanged.

Server push: deferred; no user-facing device registration/delivery contract exists.
