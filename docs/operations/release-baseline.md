# Ryczałt Platform Baseline v0.1

## Repository layout

The deployable applications live under `apps/`:

- `apps/backend` — Spring Boot API and database migrations
- `apps/mobile` — Expo / React Native application
- `apps/customer-web` — Spring Boot / Thymeleaf customer web
- `apps/backoffice` — reserved for the future staff application

Each application has its own validation working directory and path-scoped GitHub Actions
workflow. Root-level mobile commands are intentionally not used by CI.

## Validation and build model

- `backend-ci.yml` runs Maven verify, including unit, context, integration, and empty/upgrade
  migration tests, then builds a SHA-tagged local Docker image.
- `customer-web-ci.yml` runs Maven verify and builds the customer-web container.
- `mobile-ci.yml` runs npm installation, typecheck, lint, format check, unit tests, and Expo Doctor.
- `mobile-build.yml` creates an Android preview artifact on `develop` and a production candidate
  on `main`; the EAS CLI is pinned to `24.8.0`.
- `mobile-submit.yml` is manual and is the only store-submission workflow.

PR workflows validate only. Deployment credentials and target infrastructure are intentionally
not embedded in this repository. When DEV/STAGING deployment is added, it must promote the exact
image tagged with the commit SHA rather than rebuilding source or using `latest`.

## Runtime identity and rollback

The backend exposes `gitSha`, `version`, and `buildTime` under `/actuator/info` from the
`RYCZALT_GIT_SHA`, `RYCZALT_BUILD_VERSION`, and `RYCZALT_BUILD_TIME` environment variables.
Deployments should set those values from the immutable artifact metadata.

Rollback is a deployment of the previous image SHA/revision. Database changes must remain
backward-compatible across the application rollout; add and backfill before removing obsolete
columns. After the first production release, released Flyway migrations are immutable—add a new
migration instead of editing an old one.

## Environment contract

DEV, STAGING, and PROD require separate databases, secrets, backend URLs, allowed origins, and
KSeF modes. DEV and STAGING use test KSeF credentials and fixture accounts; PROD uses production
KSeF credentials and real user data. Preview mobile builds must receive an explicit DEV or test
API URL and must never inherit the production URL implicitly.

Branch protection and deployment environments remain repository-host configuration: require the
affected app checks on `develop` and `main`, require pull requests, and keep production deploy
approval manual until the first release has completed its rollback drill.
