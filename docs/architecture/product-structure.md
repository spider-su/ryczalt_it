# Ryczałt product structure

Ryczałt is being separated from Investory into one product repository with independently deployable surfaces.

## Product applications

- `apps/backend` — Spring Boot accounting backend extracted from Investory.
- `apps/mobile` — Expo / React Native end-user application.
- `apps/customer-web` — accounting-only Thymeleaf customer web seed extracted from Investory.
- `apps/backoffice` — reserved for future administrator and accounting-reviewer workflows.
- `docs/backend` and `docs/investory` — migrated accounting-domain and cross-cutting accounting documentation.

## Deployment boundary

Backend, mobile, customer web, and future backoffice must have independent application boundaries and release pipelines.
No frontend owns tax/VAT/ZUS calculation rules; the backend remains authoritative.

## Migration rule

Do not delete accounting code from Investory until parity tests and standalone deployments are verified.
