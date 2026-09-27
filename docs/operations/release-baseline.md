# Ryczałt Platform Baseline v0.1

This baseline is a gate before major product expansion.

## Goal

Every application must be independently buildable and deployable, and `main` must remain releasable.

## Application boundaries

- `apps/backend` — Spring Boot API and migrations
- `apps/mobile` — Expo / React Native
- `apps/customer-web` — detailed customer web
- `apps/backoffice` — staff application when implementation begins

## CI vs CD

PRs validate only.

Target environment model:

```text
PR
  -> tests/build

develop
  -> build immutable artifact
  -> DEV deployment

main
  -> build immutable release candidate
  -> STAGING

manual approval
  -> PROD
```

Do not rebuild source between validation and production promotion.

## Required validation

### Backend

- Maven `verify` runs Surefire unit tests and Failsafe integration tests
- full Spring context startup against clean PostgreSQL, including Flyway/JPA wiring
- `/actuator/health` reports `UP` in the started backend application
- empty PostgreSQL migration test
- upgrade-from-previous-release migration test
- Docker image build after all backend tests pass; CI loads the SHA-tagged image and starts it against temporary PostgreSQL, requiring `/actuator/health` to report `UP` before the job succeeds

### Mobile

- `npm ci`
- typecheck
- lint/format checks
- unit tests
- Expo Doctor
- preview/release build when explicitly requested by the release workflow

### Customer web

- Maven verify
- full context/startup smoke test with the production HTTP accounting adapter wired
- public login-page HTTP smoke test without requiring a reachable backend
- authenticated/profile-bound accounting behavior covered separately by customer-web security tests
- Docker image build

### Backoffice

Add equivalent application-specific checks when code is introduced.

## Immutable artifacts

Backend and web images should be identified by commit SHA or release version.

Example:

```text
ryczalt_it:<git-sha>
```

Never promote a mutable `latest` tag as the deployment identity.

Expose build identity through health/info metadata where practical:

- Git SHA
- application version
- build time

## Database migrations

Before first standalone production release, extraction baselines may still be corrected deliberately.

After first production release:

- released Flyway migrations are immutable
- schema changes are additive/backward-compatible first
- destructive cleanup happens only after compatible application rollout
- both clean install and previous-release upgrade are tested

## Environments

Customer web has a runtime dependency on the standalone backend API. Configure `RYCZALT_BACKEND_URL` explicitly in each environment; customer-web does not default to a deployed backend. Its application context can start without the backend being reachable, but customer operations require the configured service.

Maintain separate DEV, STAGING and PROD values for:

- database
- secrets
- API URL
- allowed origins
- KSeF environment/credentials
- fixture/test accounts

Preview/mobile development must never silently fall back to production API configuration.

## Secrets

Keep outside Git:

- token signing secrets
- KSeF credentials/certificates
- integration encryption key
- DB credentials
- Expo token
- store credentials

## Smoke tests after deployment

At minimum:

- health
- readiness
- authentication with a dedicated non-personal test identity
- `/api/v1/auth/me`
- one accounting-period read

Do not use personal production data for automated smoke tests.

## Rollback

Application rollback = deploy the previous known-good immutable image/revision.

Database design must permit this through backward-compatible migration sequencing.

Document and rehearse rollback before first production release.

## Branch protection

Require PRs and relevant app checks on `develop` and `main`.

Use path-scoped workflows so unrelated applications are not rebuilt unnecessarily.

Production promotion and mobile store submission remain explicit/manual until the release process has completed a successful rollback drill.

## Baseline exit criteria

Do not call the delivery platform stable until:

- repository paths are final
- backend, mobile and customer web build independently
- migrations pass clean + upgrade paths
- Docker images build reproducibly
- DEV deploy works
- smoke tests pass
- mobile preview points to DEV/test backend explicitly
- no runtime dependency on Investory remains
- rollback procedure is documented and proven
