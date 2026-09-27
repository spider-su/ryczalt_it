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

## Runtime secrets and local development

The default runtime requires `RYCZALT_TOKEN_SECRET` to be explicitly configured.
Use a cryptographically random value of at least 32 characters, keep it outside
Git, and use the same value across backend instances. There is deliberately no
production fallback: startup fails if the setting is absent.

`RYCZALT_INTEGRATION_MASTER_KEY` is required when encrypting or decrypting
integration credentials and must be at least 32 characters. Keep it stable
across deployments and backups; changing it makes existing encrypted credentials
unreadable unless they are re-encrypted with the old key available.

For local development, activate the `local` profile. Its database defaults to a
local PostgreSQL instance and its local-only secrets are not suitable for any
shared environment. Override `DATABASE_URL`, `DATABASE_USER`, and
`DATABASE_PASSWORD` as needed. Tests use isolated test-classpath configuration
and deterministic test-only keys.
