# Ryczałt product structure

Ryczałt is being separated from Investory into one product repository with independently deployable surfaces.

## Current extraction layout

- `apps/backend` — Spring Boot accounting backend extracted from Investory.
- `apps/customer-web` — accounting-only Thymeleaf customer web seed extracted from Investory.
- repository root — existing Expo/React Native mobile application, intentionally left in place during extraction.
- `docs/backend` and `docs/investory` — migrated accounting-domain and cross-cutting accounting documentation.

## Planned surface

A future `apps/backoffice` will host administrator/accounting-reviewer workflows. It is not fabricated
from the customer accounting UI during this migration because Investory does not currently contain that
independent application.

## Deployment boundary

Backend, mobile, customer web, and future backoffice must have independent release pipelines.
No frontend owns tax/VAT/ZUS calculation rules; the backend remains authoritative.

## Migration rule

Do not delete accounting code from Investory until parity tests and standalone deployments are verified.
