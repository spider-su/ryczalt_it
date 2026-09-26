# Ryczałt

Ryczałt is an independent accounting product for Polish JDG users. It is no longer treated as an Investory module.

The product is intentionally narrow at first: **JDG, 12% ryczałt, active VAT, monthly PIT and VAT periods**. The goal is to make this supported case exceptionally simple and automated before expanding to more tax regimes.

## Product surfaces

- `apps/backend` — authoritative Spring Boot accounting backend
- `apps/mobile` — Expo / React Native app for everyday customer tasks
- `apps/customer-web` — detailed customer workspace for settings, history, reports and advanced workflows
- `apps/backoffice` — staff workspace for administrators and accounting reviewers
- `docs/` — product, architecture, operations and migration documentation

All four applications belong to one product repository but have independent build and deployment cycles.

## Product principle

The user should provide as little data as possible.

Target first-use flow:

```text
NIP
 -> retrieve company data
 -> confirm supported accounting configuration
 -> answer only required ZUS questions
 -> connect KSeF now or skip
 -> Home
```

KSeF is optional during onboarding and can be configured later.

The backend remains authoritative for PIT/ryczałt, VAT, ZUS, payment obligations, classification and accounting completeness. Frontends present and manage those facts; they do not independently calculate tax obligations.

## Experience split

- **Mobile:** “What do I need to do now?”
- **Customer web:** “What exactly happened, why, and how do I manage it?”
- **Backoffice:** “What needs review, correction, support or operational intervention?”

## Current supported accounting scope

| Area | Supported now |
|---|---|
| Legal form | JDG |
| Income tax | Ryczałt 12% |
| PIT period | Monthly |
| VAT | Active VAT taxpayer |
| VAT period | Monthly |
| KSeF | Optional |
| Other rates / quarterly / non-VAT / other forms | Planned, not enabled |

Unsupported configurations may be visible in UI as **Coming soon / Wkrótce**, but must not be activated or silently coerced into the supported profile.

## Build and release baseline

Before further product expansion, the repository must keep a stable build/deployment baseline:

- each app builds independently
- PRs validate only
- artifacts are immutable and SHA-versioned
- DEV/STAGING/PROD remain separate
- production promotion is explicit
- Flyway migrations are verified from empty and previous-release schemas
- mobile store submission remains manual

See [release baseline](docs/operations/release-baseline.md).

## Documentation

Start here:

- [Product strategy](docs/product/strategy.md)
- [Automated onboarding](docs/product/onboarding.md)
- [Roadmap](docs/product/roadmap.md)
- [Product structure](docs/architecture/product-structure.md)
- [Release baseline](docs/operations/release-baseline.md)
- [Investory extraction](docs/migration/investory-extraction.md)

## Validation

Backend:

```bash
mvn -B -f apps/backend/pom.xml verify
docker build -t ryczalt-backend:local apps/backend
```

Customer web:

```bash
mvn -B -f apps/customer-web/pom.xml verify
docker build -t ryczalt-customer-web:local apps/customer-web
```

Mobile:

```bash
cd apps/mobile
npm ci
npm run ci
npx expo-doctor
```

The source Investory repository remains a separate investment/retirement product. New Ryczałt functionality must not depend on Investory runtime services or database tables.
