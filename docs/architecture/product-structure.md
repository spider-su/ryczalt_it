# Ryczałt product structure

## Repository model

Ryczałt is one product repository with four application boundaries:

```text
apps/
  backend/
  mobile/
  customer-web/
  backoffice/
```

A monorepo enables coordinated domain/API changes without coupling deployment cycles.

## Applications

The application boundaries describe ownership, not equal delivery maturity.
For controlled-POC status and supported scope, see
[`docs/product/poc-scope.md`](../product/poc-scope.md) and the
[`roadmap`](../product/roadmap.md). Backend-provisioned accounting configuration
is consumed by clients; current account activation is invitation-based, not
NIP-based self-service.

### Backend

Spring Boot + PostgreSQL.

Authoritative owner of (within implemented and validated contracts):

- company/accounting profile
- invoices and counterparties
- PIT / ryczałt
- VAT accounting state; JPK_V7M generation/submission is deferred
- ZUS
- obligations and payments
- accounting completeness
- implemented/enabled accounting integrations; KSeF issuance/FA(3) is deferred
- accounting audit/history
- authorization for customer and staff operations

No frontend directly owns or recalculates these rules.

### Mobile

Expo / React Native.

Primary end-user application for quick everyday work.

It should answer:

> What do I need to do now?

Typical responsibilities:

- Home
- current invoices
- obligations/deadlines
- quick imports
- mark/confirm supported payment states
- notifications
- KSeF connection status
- basic settings

### Customer web

Detailed customer workspace.

It should answer:

> What happened, why, and how can I manage it?

Typical responsibilities:

- advanced invoice filtering
- detailed accounting breakdowns
- historical data
- full company/tax/ZUS settings
- reports/exports
- document management
- integration history
- access management

The current Thymeleaf extraction is a parity seed, not the final statement that customer web must remain Thymeleaf indefinitely.

Customer web authentication is server-side: the browser holds a customer-web session cookie, while customer-web stores the user's backend bearer token in that session. The backend `/api/v1/auth/me` response supplies the accessible profile list, and each profile-scoped web route is checked against it before accounting access.

The customer-web accounting boundary is implemented by `HttpRyczaltWebAccountingClient`, which maps the existing web client seam to the canonical backend REST API. It forwards the current user's bearer token; backend profile authorization remains authoritative. Customer-web has no accounting database connection.

```text
Browser
  -> Customer Web session
  -> Backend bearer token
  -> Customer-web accounting HTTP adapter
  -> Backend API and profile authorization
```

### Backoffice (planned surface; not a completed POC application)

Internal staff workspace for administrators and accounting reviewers.

It should answer:

> What requires review, correction, support or operational action?

Typical responsibilities:

- review queues
- accounting exceptions
- classification corrections
- completeness issues
- support investigation
- integration failures
- role/assignment administration
- audit trail

Customer web and backoffice must remain separate authorization surfaces even if they later share UI packages.

## Shared code

Share contracts and generic frontend concerns where useful:

- generated/typed API client
- stable API types
- localization primitives
- generic formatting utilities

Do not share authoritative accounting calculations into frontend packages.

## Deployment

Each app has an independent build/release lifecycle.

A backend release must not require a mobile release if API compatibility is preserved.

Current backend and customer-web Docker publishers run after their respective
CI workflows on `main` and publish `aserobaba/ryczalt_it` and
`aserobaba/ryczalt_it_ui` using immutable `sha-<short-sha>` tags plus mutable
`latest`. They scan the pushed digest with Trivy and upload SBOM artifacts.
This proves image-pipeline behavior only; it does not prove Cloud Run deployment
or a POC release. See [release baseline](../operations/release-baseline.md).

Target environment path (deployment evidence is still required):

```text
PR -> validate
develop -> DEV
main -> STAGING / release candidate
manual approval -> PROD
```

Mobile store submission remains manual.

## Data ownership

Ryczałt backend exclusively owns Ryczałt persistence.

### Canonical identity and accounting profile

- `app_users` owns login identity, authentication state, platform role, and
  external authentication subject identifiers. It is not the canonical source
  for taxpayer or accounting configuration.
- `portfolios` is the profile/container and access boundary: it owns profile ID,
  user ownership, and membership relationships. It is not the canonical source
  for taxpayer or payment details.
- `ryczalt_profile` is the canonical source for NIP, taxpayer/company name and
  owner details, tax office, payment accounts, ZUS/accounting preferences, and
  `auto_approve_known_counterparties`.

`app_users.birth_date` and the `portfolios.owner`, `taxpayer_*`,
`tax_micro_account`, and `zus_payment_account` columns are retained as
transitional legacy/import compatibility fields. They are not read or written
by current product logic and must not be used by new functionality or future
NIP onboarding. New and migrated taxpayer/accounting facts belong in
`ryczalt_profile`. These compatibility columns can be removed only in a
separately planned migration after imported data and downstream consumers are
verified.

There should be:

- no direct customer-web/mobile/backoffice DB access
- no cross-database foreign keys into Investory
- no runtime dependency on Investory
- no accounting migration owned by Investory after cutover

## Migration rule

Do not remove source accounting ownership from Investory until standalone
parity, migration and deployment are verified. Investory remains an independent
investment/retirement product; retained Investory documents are historical
reference only.
