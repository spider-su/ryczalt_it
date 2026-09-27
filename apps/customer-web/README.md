# Ryczałt customer web

Detailed customer workspace for the Ryczałt accounting product.

## Product role

Customer web complements mobile rather than duplicating it.

It should answer:

> What exactly happened, why, and how can I manage it?

Planned responsibilities include:

- detailed accounting dashboard
- full invoice history and filtering
- detailed PIT/VAT/ZUS breakdowns
- historical opening data
- advanced company/accounting/ZUS settings
- KSeF configuration and sync history
- reports and exports
- document management
- payment history and reconciliation
- users and access

## Current state

The current code is an accounting-only Thymeleaf extraction from Investory kept for parity and reuse.

It is a **migration seed**, not a final technology commitment and not yet the complete planned customer portal.

The old in-process Investory bridge must not become a runtime dependency. The deployable customer web must consume the standalone Ryczałt backend API.

See [product structure](../../docs/architecture/product-structure.md) and [roadmap](../../docs/product/roadmap.md).
