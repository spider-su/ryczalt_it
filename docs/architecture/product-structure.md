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

### Backend

Spring Boot + PostgreSQL.

Authoritative owner of:

- company/accounting profile
- invoices and counterparties
- PIT / ryczałt
- VAT / JPK-related accounting state
- ZUS
- obligations and payments
- accounting completeness
- KSeF and accounting integrations
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

```text
Browser
  -> Customer Web session
  -> Backend bearer token
  -> Backend profile authorization
```

### Backoffice

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

Recommended environment path:

```text
PR -> validate
develop -> DEV
main -> STAGING / release candidate
manual approval -> PROD
```

Mobile store submission remains manual.

## Data ownership

Ryczałt backend exclusively owns Ryczałt persistence.

There should be:

- no direct customer-web/mobile/backoffice DB access
- no cross-database foreign keys into Investory
- no runtime dependency on Investory
- no accounting migration owned by Investory after cutover

## Migration rule

Do not remove source accounting ownership from Investory until standalone parity, migration and deployment are verified.
