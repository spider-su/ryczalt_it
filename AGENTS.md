# Ryczałt IT repository agent instructions

This repository contains the Ryczałt IT accounting backend, mobile app, and customer web. Backoffice is a planned product surface, not an implemented application. It is not the generic mobile template.

## Project scope and reuse

Treat this as a small-business application, not an enterprise platform. Read [engineering level](docs/engineering-level.md) and [mobile agent reuse map](docs/mobile-agent-reuse.md) before adding abstractions or dependencies. Financial correctness, API authorization, KSeF integration and privacy remain non-negotiable.

## Product and security invariants
- Preserve invoice, VAT, ZUS, PIT-28, payment, approval, KSeF, FX and accounting behavior unless explicitly tasked with changing it.
- Keep backend authorization, profile isolation, API contracts and integration credentials intact.
- Do not copy accounting data, tokens, credentials, signing keys or production configuration into tests, documentation or logs.
- Mobile authentication/session storage uses existing project-specific mechanisms. Never replace secure token storage with unencrypted AsyncStorage or localStorage.
- Keep existing Sentry crash reporting, locale support, native/web platform handling and safe-area ownership.
- Avoid new storage abstractions or duplicate loading/error components without a demonstrated need.
- Do not clear real user data, reset profiles, or run destructive migrations during routine validation.

## Workflow
1. Identify whether the change belongs in `apps/mobile`, `apps/backend`, `apps/customer-web`, or a combination.
2. Read existing contracts and focused regression tests before editing.
3. Keep changes small; do not combine unrelated business logic with UI infrastructure.
4. For mobile changes run `cd apps/mobile && npm ci && npm run ci && npx expo-doctor` where available.
5. For backend changes run the appropriate Maven tests and check relevant integration behavior.
6. Record commands, results, limitations, and any unverified emulator/physical-device behavior.
7. Never claim that source CI verifies device behavior or live banking/KSeF connectivity.

## Codex workflows
See `.codex/SKILLS.md`. Existing project-specific APK build and emulator audit skills must remain authoritative.

## Reusable mobile POC guardrails

Before refactoring navigation, local state, notifications, or release flow, read [mobile POC hardening](docs/mobile-poc-hardening.md). Retain visible-tab inset ownership unless intentionally hiding tabs; never consume the bottom inset twice. Keep confirmed records and backend/native authority intact, verify scroll and Back behavior, and test updates without clearing local data. APK/CI success is not physical-device or Play AAB evidence.
