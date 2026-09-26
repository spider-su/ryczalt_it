# Ryczałt backend

Standalone Spring Boot backend for the Ryczałt product.

## Responsibility

The backend is authoritative for:

- company/accounting profiles
- invoices and counterparties
- PIT / ryczałt calculations
- VAT accounting state
- ZUS calculations
- obligations and payment state
- accounting completeness
- KSeF and accounting integrations
- authorization and audit history

Customer applications must not reproduce these calculations independently.

## Current supported profile

- JDG
- ryczałt 12%
- monthly PIT
- active VAT
- monthly VAT
- optional KSeF

Unsupported combinations must be rejected by backend validation rather than silently normalized.

## Migration status

The code was extracted from `spider-su/investory@develop`. Package names may still contain historical Investory naming during the parity phase. Renaming is separate from behavioral extraction.

See:

- [product strategy](../../docs/product/strategy.md)
- [onboarding](../../docs/product/onboarding.md)
- [migration plan](../../docs/migration/investory-extraction.md)
- [release baseline](../../docs/operations/release-baseline.md)
