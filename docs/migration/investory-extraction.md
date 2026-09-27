# Investory → Ryczałt extraction

## Goal

Move accounting ownership out of Investory and establish Ryczałt as an independent product.

Investory remains the separate investment/retirement product.

## Frozen source baselines

- Investory accounting/backend/web source: `spider-su/investory@20ef753723ab73f1dbe7fed2a9b0fb6df3a3394f`
- Ryczałt mobile base: `spider-su/ryczalt_it@de38e0b4dd0ab83d58e7db44a2bb5176cffb0eb3`

## Migrated ownership

Ryczałt now owns:

- accounting domain code and tests
- accounting REST API
- accounting persistence/migrations
- KSeF/bank/NBP/ZUS accounting adapters
- identity/profile boundary required by current product flows
- mobile end-user application
- accounting-only customer web seed
- accounting architecture/API/testing documentation

## Product repository layout

- `apps/backend`
- `apps/mobile`
- `apps/customer-web`
- `apps/backoffice`
- `docs/`

## Intentionally not migrated

- portfolio/investment domain
- retirement and long-term planning
- broker investment imports
- investment dashboards
- unrelated Investory integrations
- Investory-wide reporting/profile UI

## Current extraction principle

Preserve accounting behavior first; rename/refactor historical package names later.

Do not delete accounting implementation from Investory until:

1. standalone migrations are verified
2. standalone backend builds and deploys
3. mobile works against the standalone backend
4. accounting parity is confirmed
5. rollback is documented

## Next product stages

This extraction-era sequence is historical, not the active product roadmap.
Current account activation is invitation-based and backend configuration is
authoritative. The controlled POC still requires closure of calculation
completeness, historical opening-state, deployment, and end-to-end acceptance
gates. See the current [roadmap](../product/roadmap.md) and
[POC scope](../product/poc-scope.md).

## Legacy documentation

`docs/investory/` contains documents copied during extraction. They are retained for reference and migration parity. They must not override current Ryczałt product/architecture decisions.

## Cutover rule

The Investory source repository is not modified by this documentation PR. Accounting removal from Investory belongs to a later verified cutover PR.
