# Investory → Ryczałt extraction

## Goal

Make Ryczałt an independently deployable accounting product while preserving the current accounting behavior from Investory.

## Source baselines

- Backend and accounting web UI: `spider-su/investory@develop`
- Mobile: this repository's `develop`

## Migration boundary

Moves:
- `modules/ryczalt` domain, calculations, persistence and tests
- Ryczałt REST controllers and DTOs
- accounting-only KSeF, bank and NBP adapters required by the domain
- Ryczałt SQL migrations
- accounting-specific web UI controllers/templates/styles
- accounting documentation and tests

Does not move:
- investment portfolio
- long-term planning
- retirement
- investment dashboards/imports
- unrelated integrations

## Strategy

1. Copy code first with package names intact.
2. Establish standalone Maven build and database migrations.
3. Preserve REST contracts used by the existing mobile app.
4. Extract the accounting web UI as a separate customer-web/backoffice seed.
5. Verify parity before deleting anything from Investory.
6. Only after parity, remove accounting ownership from Investory in a separate PR.

## Transitional repository layout

- `apps/backend` — standalone accounting backend
- `apps/customer-web` — extracted accounting web UI seed
- repository root — existing Expo mobile app (kept in place during this extraction to avoid a simultaneous mobile path/build migration)

A later mechanical change can move the mobile app under `apps/mobile` once backend extraction is green.
