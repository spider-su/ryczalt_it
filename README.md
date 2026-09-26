# Ryczałt

Independent accounting product for Polish JDG users, extracted from Investory.

The current supported accounting scope is intentionally narrow: JDG on 12% ryczałt, active VAT,
monthly PIT/VAT periods, with the existing ZUS/KSeF/accounting workflows preserved from Investory.

## Repository layout

- `apps/backend` — standalone Spring Boot accounting backend and authoritative accounting rules
- `apps/customer-web` — extracted accounting-only web UI seed for detailed customer workflows
- `apps/backoffice` — planned staff application for administrators and accounting reviewers
- repository root — existing Expo / React Native mobile application
- `docs/` — accounting, migration and product architecture documentation

The mobile application remains at the repository root during this extraction so that backend separation
does not simultaneously change the existing Expo/EAS build layout. Moving it to `apps/mobile` is a
separate mechanical follow-up after this PR is merged.

## Product boundaries

Ryczałt owns accounting profiles, invoices, counterparties, PIT/ryczałt, VAT, ZUS, payments,
KSeF/accounting integrations and accounting-specific persistence.

Investory remains a separate investment/retirement product. No new Ryczałt feature should depend on
Investory database tables or services after the standalone cutover.

## Validation

Backend:

```bash
mvn -B -f apps/backend/pom.xml test
```

Customer web:

```bash
mvn -B -f apps/customer-web/pom.xml test
```

Mobile:

```bash
npm ci
npm run typecheck
npm test
npm run ci
npx expo-doctor
```

See [mobile documentation](docs/mobile.md) for the existing Expo app setup and
[extraction plan](docs/migration/investory-extraction.md) for migration/cutover details.

## Current migration branch

The initial extraction is developed on `feature/extract-accounting-monorepo` from
`ryczalt_it/develop`. The source Investory repository is not modified by this extraction PR.
