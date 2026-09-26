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

## Onboarding direction

Target flow:

```text
NIP
 -> retrieve and confirm company
 -> confirm supported accounting setup
 -> required ZUS questions
 -> connect KSeF or configure later
 -> Home
```

KSeF is optional and must not block onboarding.

See [automated onboarding](../../docs/product/onboarding.md).

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
