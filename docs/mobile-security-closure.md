# Mobile security closure

## Current decisions

- `scripts/tmp/` is ignored and generated live API output is no longer tracked.
- A historical `set-cookie` header was present in the removed live API output introduced by commit `8022d12`. Treat the associated server session as exposed and revoke/rotate it through the deployment or provider controls. Repository history was not rewritten.
- The mobile client has no refresh-token endpoint to use. Authentication remains the backend's bearer-token `/api/v1/auth/login` and `/api/v1/auth/me` contract; an expired or invalid token returns the user to sign-in.
- Native tokens remain in SecureStore. When the user explicitly enables biometrics, the native token is rewritten with `requireAuthentication`; restoration authenticates before reading the protected token. A cancelled or failed biometric prompt does not restore the session.
- Web uses the existing browser storage adapter because the backend does not expose an HttpOnly cookie session contract. This remains a release risk for web deployments; no JavaScript-accessible cookie workaround was added.
- Normal API reads and authentication use a 20-second timeout. Upload recognition uses 120 seconds and backend calculation uses 180 seconds. Financial mutations are not automatically retried.
- Partial monthly loading is fail-closed: if any required monthly dataset fails, the repository throws a `PartialAccountingError` instead of presenting a fabricated complete month.

## Environment contract

`EXPO_PUBLIC_API_URL` is required for API mode. There is no production URL fallback. EAS preview and production profiles set explicit `EXPO_PUBLIC_APP_ENV` values; configure the corresponding API URL in the EAS environment before building. Demo/mock mode remains usable without a live API URL.

## Not verified here

- Physical Android/iOS biometric, background/resume, offline, and network-transition behavior.
- Authenticated live API latency and endpoint behavior.
- Revocation of the historical server session; this requires authorized deployment/provider access.
- Secure HttpOnly web sessions and refresh tokens, which require backend support.
