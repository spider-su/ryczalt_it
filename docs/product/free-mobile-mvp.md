# Free Android release — local-first scope (decision, 2026-11-08)

## Goal

Ship a **free, no-account, no-Ryczalt-backend** Expo/React Native app for a single Polish JDG with **12% ryczałt, active VAT, monthly PIT and VAT**. This replaces the earlier invitation/backend-first POC for **the free mobile distribution only**. Keep the existing backend, customer web and backoffice untouched for possible future premium hosting.

**No commercial/accounting backend calls in free mode.** Direct HTTPS calls to official public tax registers and KSeF are permitted: “no backend” means no product-owned server or user account. The app must never use the existing `AccountingApi` or its bearer token/authentication screens in free mode.

## Release UX (three primary surfaces)

1. **Setup / Firma** — enter a NIP; validate checksum locally; fetch public registry details from the official Polish taxpayer/CEIDG-compatible source; present the retrieved fields and source/time for confirmation; keep locally. NIP lookup is **not** taxpayer login or evidence of authority over the business. Allow corrections if a register field is unavailable.
2. **Faktury / KSeF** — user supplies **their own read-authorized KSeF credential**. Explicitly explain required scope; authenticate directly to official KSeF API v2, list/read issued and received invoices (read-only) for a chosen date range; deduplicate by KSeF invoice ID; show last successful sync, errors, counts, source and invoice type; never issue, edit, delete or send invoices. Incoming invoices must not be automatically counted as deductible VAT without classification.
3. **Podatki / Miesiąc** — calculate and display monthly **estimated** ryczałt/PIT, VAT output/input/carry-forward and ZUS-related information using **only the mobile calculation engine** and persisted local history. Show calculation breakdown, due dates, provenance and missing inputs; offer explicit manual entry of facts unavailable from invoices (e.g. previous-year revenue, paid ZUS contributions, employment/regime choice, opening balances, permitted deductions, VAT classification and prior-month VAT credits). Nothing may silently default missing historical values to zero.

## Hard exclusions for v1

- No Ryczalt-operated backend, login, invitations, database, cloud sync, web/customer/backoffice UI, push server or multi-device accounts.
- No bank connection, Open Banking, transaction imports, reconciliation, payment confirmation/matching or external integrations beyond **NIP lookup and KSeF**.
- No invoice issuance, OCR, manual document upload, PDF ingestion, counterparties management, Telegram, external notifications, automatic tax filing or JPK/PIT submissions.
- No premium upsell that blocks free read-only KSeF and local calculations. Premium architecture may be discussed in docs, but hide unsupported controls from the free UI.
- No new tax regimes in free v1. Reject unsupported years, regimes, currencies lacking reliable PLN conversions, or rates rather than guessing.

## Technical boundaries

```text
Expo mobile only
  -> Official public register (NIP / company details)
  -> Official MF KSeF API v2 (read-only authenticated HTTPS)
  -> Local encrypted storage (settings, credentials, invoice facts, calculation snapshots)
  -> Versioned pure TypeScript calculation engine (no HTTP dependencies)
No product backend / no own server
```

- Keep all credentials and invoice information on device. Store KSeF secrets in Android Keystore-backed secure storage (`expo-secure-store`), NOT AsyncStorage, logs, Sentry events, analytics, query strings or exported backups. If secure storage is unavailable, fail closed. Provide disconnect / remove local data controls. Verify local database encryption independently; AsyncStorage alone is not an encrypted accounting-data store.
- Direct KSeF v2 authentication is **not** an HTTP bearer token copy/paste. KSeF system token -> challenge -> encrypt `token|timestamp` using current MF RSA-OAEP/SHA-256 public key -> initiate auth -> poll -> obtain short-lived JWT -> query read-authorized invoice endpoints. Implement against current OpenAPI and integration guide, handle token expiry and permission failures. There must be no private server-side key.
- **2027 authentication gate**: MF's March 2026 manual states KSeF token authentication is transitional through 2026 and certificates are intended from 2027. Validate current law and API behavior before shipping/advertising KSeF token onboarding for 2027. Certificate authentication must be supported or the feature visibly marked unavailable; never silently simulate a sync. Make credential type a pluggable interface to avoid rewriting the invoice module.
- Use safe deterministic decimal/cents arithmetic; no JavaScript floating-point calculations for tax. Version tax rules by effective date and source. Port existing Java backend calculations, not UI display/DTO functions, and compare with Java reference outputs including rounding, year-to-date history, VAT carry-forward and missing prior contributions.
- KSeF cannot establish whether an invoice is paid, whether every expense is VAT deductible, the applicable ryczałt rate for mixed services, cash-basis choices or complete opening-year ZUS/VAT history. Separate imported facts from user-confirmed accounting classifications. Unsupported invoice features or missing FX rates block “ready” output.
- Offline: prior synced data and validated tax estimates remain readable; live NIP lookup and KSeF refresh require internet. Do not show offline data as current after a failed refresh.
- Prefer local schema migrations and tests. Preserve existing backend and customer apps for premium; do not delete them as part of free Android scope.

## Porting / implementation sequence

1. **Free feature flag and entrypoint**: launch to local setup, never `AuthProvider`/`AuthScreen`/`AccountingApi` in free flavor; remove backend-only tabs/actions and APIs from shipping bundle; retain backend version on separate flavor/branch if needed.
2. **Local data contract**: versioned company, credential reference, invoice, tax classification, opening-state, period and tax-rule records; sensitive data protection, wipe and migration tests.
3. **NIP lookup**: checksum + official source adapter with fixtures, retry/timeout and clear source attribution; use the public register's supported fields only.
4. **KSeF read-only adapter**: official test first; credential onboarding, secure storage, auth state machine, scoped issued/received query, pagination, dedupe, XML parse (FA(3) and supported schema), classification/missing-data state, tests with sanitized fixtures. No token or live invoice data in test fixtures.
5. **Port Java calculation domain**: map each backend rule/rule-set and its tests to pure TS (or shared WASM if validated); exact parity golden tests, error cases, tax-year/version controls.
6. **Monthly summary UI**: show estimated PIT, VAT, ZUS and combined obligations with breakdown; distinguish due, not-computable and missing facts, never claim tax submission/payment.
7. **Release gates**: `npm run ci`, `expo-doctor`, Android build/install, KSeF test-environment auth/sync, no-backend network audit, secret/log audit, privacy policy/data safety update, manual accountant review of representative amounts and month boundaries.

## Critical acceptance tests

- New install with no product account can validate NIP and review returned company details.
- With read-authorized credential, imports a chosen month from official KSeF test; second sync is idempotent; an expired/revoked credential shows error without losing prior records.
- **Never** connects to any Ryczalt backend, banking provider, Telegram, or third-party auth service.
- Calculations match known backend fixtures for 2026 monthly 12% ryczałt / active VAT, including no revenue, invoice credit notes, PLN/EUR/USD FX, VAT carry-forward, mid-year opening state, ZUS paid/qualified UoP and roundings.
- An unknown invoice classification, no prior VAT balance, absent FX, unsupported year/rate or missing paid ZUS must produce explicit **incomplete estimate**, not a plausible invented PLN figure.
- No private invoice payload or KSeF token in device logs, exceptions, crash reports, plaintext backups or network telemetry.

## Source-of-truth links

- [MF production KSeF v2 OpenAPI](https://api.ksef.mf.gov.pl/docs/v2/index.html)
- [MF KSeF overview](https://www.ksef.mf.gov.pl/)
- [MF KSeF manual, March 2026](https://ksef.podatki.gov.pl/media/sthoiadq/podrecznik-ksef-20-cz-i-rozpoczecie-korzystania-z-ksef-25032026.pdf)

> Decision/spec only. Existing source is still backend-dependent until the implementation and validation gates above are completed. Do not label the current app “local-first” or “ready for free release” based only on this document.
