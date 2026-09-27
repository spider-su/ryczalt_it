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

## Authentication and profile access

Customer web authenticates credentials through the backend `POST /api/v1/auth/login` endpoint and resolves the user's default and accessible profiles through `GET /api/v1/auth/me`. The backend bearer token is kept in server-side HTTP session state; the browser receives only the normal session cookie. Tokens are not placed in browser storage, URLs, rendered HTML, or application logs.

Every `/profiles/{profileId}/...` route is checked against the accessible profile list returned by the backend. A profile ID in a URL does not grant access. Switching to another accessible profile through its route updates the current server-side profile context.

Configure the backend origin with `RYCZALT_BACKEND_URL`. Production configuration requires an explicit value. For local HTTP development, activate the `local` Spring profile; it defaults to `http://localhost:8080` and permits a non-Secure local session cookie. The default cookie is HttpOnly, Secure, SameSite=Lax, and the session idle timeout is 30 minutes.

The current backend login contract returns `expiresIn` seconds. Customer web stores that expiry and requires sign-in again after expiry or a backend 401. The backend does not currently provide refresh-token support, so customer web does not attempt token refresh. Backend 403 responses preserve the login session and deny the requested operation.

See [product structure](../../docs/architecture/product-structure.md) and [roadmap](../../docs/product/roadmap.md).
