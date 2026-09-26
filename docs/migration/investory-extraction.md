# Investory → Ryczałt extraction

## Goal

Make Ryczałt an independently deployable accounting product while preserving the current accounting behavior from Investory.

## Frozen source baselines

- Investory accounting/backend/web source: `spider-su/investory@20ef753723ab73f1dbe7fed2a9b0fb6df3a3394f` (`develop`)
- Mobile base: `spider-su/ryczalt_it@de38e0b4dd0ab83d58e7db44a2bb5176cffb0eb3` (`develop`)

## Migrated in this branch

- complete `modules/ryczalt` production source
- complete `modules/ryczalt` unit tests and certification fixtures
- accounting REST controllers and DTOs used by the mobile contract
- Ryczałt SQL migrations
- KSeF, bank, NBP and ZUS adapter code required by the accounting domain
- minimal managed-integration persistence/configuration required by KSeF
- profile-scoped authorization boundary used by accounting REST endpoints
- accounting-only Thymeleaf controllers/templates/styles/tests as `apps/customer-web`
- accounting architecture, API, migration, calculation and test documentation

## Intentionally not migrated

- investment portfolio domain
- retirement and long-term planning
- broker imports and investment dashboards
- unrelated integration plugins/jobs
- Investory-wide profile/reporting UI
- cross-domain tests whose purpose is to assert the Investory/accounting boundary

## Transitional repository layout

- `apps/backend` — standalone accounting backend extraction
- `apps/customer-web` — customer accounting web seed
- repository root — existing Expo mobile app, intentionally left in place during extraction to avoid mixing backend extraction with a mobile path/build migration
- `apps/backoffice` — planned next-stage staff application; no fake implementation is introduced in this migration

## Known extraction follow-ups

1. replace the customer web in-process bridge with an HTTP client to `apps/backend`
2. finish standalone identity/authentication ownership and migrate the minimum required identity schema
3. verify Flyway baseline ownership for managed integrations and profile membership
4. establish production deployment configuration and secrets for the backend
5. move the mobile app mechanically to `apps/mobile` after extraction parity is green
6. only then remove accounting ownership from Investory in a separate PR

## Validation rule

The source Investory repository is not modified by this branch. Deletion/cutover happens only after parity and standalone deployment are proven.
