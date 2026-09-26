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
- standalone Ryczałt Flyway baseline plus accounting migrations
- profile-scoped identity, membership and bearer-token authentication required by the existing mobile app
- invitation acceptance used by the existing mobile activation flow
- KSeF, bank, NBP and ZUS adapter code required by the accounting domain
- minimal managed-integration persistence/configuration required by KSeF
- profile-scoped authorization boundary used by accounting REST endpoints
- accounting-only Thymeleaf controllers/templates/styles/tests as `apps/customer-web`
- accounting architecture, API, migration, calculation and test documentation
- CI validation for backend, customer web and the existing mobile application

## Intentionally not migrated

- investment portfolio domain
- retirement and long-term planning
- broker imports and investment dashboards
- unrelated integration plugins/jobs
- Investory-wide profile/reporting UI
- cross-domain tests whose purpose is to assert the Investory/accounting boundary
- Google/OAuth login from Investory; the extracted backend keeps the mobile token-login contract only

## Transitional repository layout

- `apps/backend` — standalone accounting backend extraction
- `apps/customer-web` — customer accounting web seed
- repository root — existing Expo mobile app, intentionally left in place during extraction to avoid mixing backend extraction with a mobile path/build migration
- `apps/backoffice` — planned next-stage staff application; no fake implementation is introduced in this migration

## Validation completed

- `mvn -B -f apps/backend/pom.xml test`
- `mvn -B -f apps/customer-web/pom.xml test`
- standalone empty PostgreSQL migration test
- existing Mobile GitHub Actions workflow

The extraction workflow and Mobile workflow are green on the current branch.

## Known follow-ups before production cutover

1. replace the customer-web in-process boundary with an HTTP implementation against `apps/backend`, or deliberately defer customer web deployment to its planned stage
2. define production bootstrap/onboarding for creation of the first Ryczałt profile and owner instead of relying on migrated data
3. configure production secrets: `RYCZALT_TOKEN_SECRET`, `RYCZALT_INTEGRATION_MASTER_KEY`, database credentials and allowed web origins
4. add deployment workflows/Cloud Run configuration for the standalone backend
5. move the mobile app mechanically to `apps/mobile` after extraction is merged
6. implement the separate reviewer/admin backoffice application
7. only after production parity, remove accounting ownership from Investory in a separate PR

## Cutover rule

The source Investory repository is not modified by this branch. Deletion/cutover happens only after parity and standalone deployment are proven.
