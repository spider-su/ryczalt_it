# Ryczałt Mobile

Expo + React Native end-user application for the Ryczałt product.

## Product role

Mobile is optimized for quick everyday accounting and should answer:

> What do I need to do now?

Primary responsibilities:

- Home and current-period readiness
- invoices
- obligations and deadlines
- quick invoice import / supported entry
- payment status
- reminders
- KSeF connection status
- basic company/accounting settings

Detailed historical management, advanced settings, reports and bulk workflows belong primarily to customer web.

## Accounting boundary

The mobile client does not calculate PIT/ryczałt, VAT, ZUS, payment obligations, classification or accounting completeness.

It presents canonical backend state and performs presentation-level formatting only.

Unknown/missing values stay unknown; mobile must not repair missing backend financial data by deriving or substituting zero.

## Supported product scope

Current supported configuration:

- JDG
- ryczałt 12%
- monthly PIT
- active VAT
- monthly VAT

Other configurations may be shown as **Wkrótce / Coming soon**, but must not be activatable.

## Account activation

Backend-provisioned users accept an invitation, sign in, and access their
authorized profile. Mobile does not provide public self-registration or an
accounting-configuration wizard. A user with no accessible profile should be
given a clear support/access state, not a client-created profile flow.

See [account activation and future onboarding](../../docs/product/onboarding.md)
and the [controlled POC scope](../../docs/product/poc-scope.md).

## API configuration

API mode requires explicit `EXPO_PUBLIC_API_URL`. Do not silently fall back to production.

Demo/mock mode remains isolated from live services.

## Local validation

```bash
cd apps/mobile
npm ci
npm run ci
npx expo-doctor
```

## Releases

- `mobile-ci.yml` validates mobile changes
- `mobile-build.yml` builds preview or release candidates
- `mobile-submit.yml` handles explicit/manual store submission

Build and environment rules are defined in [release baseline](../../docs/operations/release-baseline.md).

## Android APK from CI

The **Local Android APK** workflow follows the `ryczalt` project's native build
pattern: Node 24, Java 17, Android SDK 36, local `expo prebuild`, then Gradle
`assembleDebug` on the GitHub runner. It does not submit an EAS Build request or
consume Expo cloud build quota. Dependencies come from the committed lockfile;
CI runs `npm ci`, the mobile quality checks, and Expo Doctor before building.

After a successful run, download the **ryczalt-it-debug-apk** artifact from the
workflow's Artifacts section. It contains the debug APK and is retained for
14 days. This debug build uses Metro for its JavaScript bundle; it is a developer
artifact. A standalone local QA release build is documented in
[the APK build skill](../../.codex/skills/ryczalt-it-build-apk/SKILL.md).
