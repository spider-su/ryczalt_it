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

Runtime boot verification is enforced in CI: the production Spring context starts with the HTTP accounting adapter wired, and the public login page is exercised over HTTP without requiring a live backend. Authenticated/profile-bound behavior is covered by the dedicated customer-web security tests.\n\nThe old in-process Investory bridge must not become a runtime dependency. Customer-web now consumes the standalone Ryczałt backend API over HTTP through `HttpRyczaltWebAccountingClient`; the UI remains behind `RyczaltWebAccountingClient`. It does not access the accounting database or backend Spring services directly.

## Authentication and profile access

Customer web authenticates credentials through the backend `POST /api/v1/auth/login` endpoint and resolves the user's default and accessible profiles through `GET /api/v1/auth/me`. The backend bearer token is kept in server-side HTTP session state; the browser receives only the normal session cookie. Tokens are not placed in browser storage, URLs, rendered HTML, or application logs.

Every `/profiles/{profileId}/...` route is checked against the accessible profile list returned by the backend. A profile ID in a URL does not grant access. Switching to another accessible profile through its route updates the current server-side profile context.

Configure the backend origin with `RYCZALT_BACKEND_URL`. Production configuration requires an explicit value. For local HTTP development, activate the `local` Spring profile; it defaults to `http://localhost:8080` and permits a non-Secure local session cookie. The default cookie is HttpOnly, Secure, SameSite=Lax, and the session idle timeout is 30 minutes.

All backend requests use the user's server-side bearer token, the profile ID validated by the web session resolver, and bounded connection/read timeouts. The client maps transport responses into customer-web view records centrally. Backend errors are typed; authorization failures do not become empty data, and transient/uncertain failures on mutations are not automatically retried. Invoice and bank uploads are sent as multipart requests directly to the backend without customer-web file persistence.

Backend error mapping currently relies on HTTP status because the accounting API does not yet expose stable machine-readable error codes. The bank-import response reports received/imported/duplicates only; the web seam's unused updated/failed counters therefore remain zero for that operation. These are API contract follow-ups, not locally inferred accounting results.

The current backend login contract returns `expiresIn` seconds. Customer web stores that expiry and requires sign-in again after expiry or a backend 401. The backend does not currently provide refresh-token support, so customer web does not attempt token refresh. Backend 403 responses preserve the login session and deny the requested operation.

See [product structure](../../docs/architecture/product-structure.md) and [roadmap](../../docs/product/roadmap.md).
