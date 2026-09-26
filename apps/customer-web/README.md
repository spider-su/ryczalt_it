# Ryczałt customer web

Accounting-only customer web UI extracted from `spider-su/investory@develop`.

The Thymeleaf controllers, view assembler, templates, styles, and tests are preserved for parity.
The old in-process bridge to the Investory backend is intentionally not part of the deployable
application boundary. The next stage replaces it with an HTTP implementation of
`RyczaltWebAccountingClient` that calls `apps/backend`.

Until that client exists, this app is an extraction/parity seed rather than a production deployment.
