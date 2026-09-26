# Ryczałt

Independent accounting product for Polish JDG users, extracted from Investory.

The current supported accounting scope is intentionally narrow: JDG on 12% ryczałt, active VAT,
monthly PIT/VAT periods, with the existing ZUS/KSeF/accounting workflows preserved from Investory.

## Repository layout

- `apps/backend` — standalone Spring Boot accounting backend and authoritative accounting rules
- `apps/customer-web` — extracted accounting-only web UI seed for detailed customer workflows
- `apps/mobile` — Expo / React Native end-user application
- `apps/backoffice` — planned staff application for administrators and accounting reviewers
- `docs/` — accounting, migration and product architecture documentation

## Product boundaries

Ryczałt owns accounting profiles, invoices, counterparties, PIT/ryczałt, VAT, ZUS, payments,
KSeF/accounting integrations and accounting-specific persistence.

Investory remains a separate investment/retirement product. No new Ryczałt feature should depend on
Investory database tables or services after the standalone cutover.

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
npm run typecheck
npm test
npm run ci
npx expo-doctor
```

Mobile preview and production-candidate builds are handled by
`.github/workflows/mobile-build.yml` using pinned EAS CLI version `24.8.0`.
Store submission remains manual through `.github/workflows/mobile-submit.yml`.

CI workflows are path-scoped to `apps/backend`, `apps/customer-web`, and `apps/mobile`.
The `apps/backoffice` directory is reserved for the future staff application and has no
deployable code yet.

See [mobile documentation](apps/mobile/README.md) for Expo setup and
[extraction plan](docs/migration/investory-extraction.md) for migration/cutover details.
See the [release baseline](docs/operations/release-baseline.md) for CI, artifact, environment,
and rollback rules.

## Current migration branch

The initial extraction is developed on `feature/extract-accounting-monorepo` from
`ryczalt_it/develop`. The source Investory repository is not modified by this extraction PR.
