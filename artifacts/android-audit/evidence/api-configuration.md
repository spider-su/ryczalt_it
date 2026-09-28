# API configuration evidence

- `EXPO_PUBLIC_API_URL` is unset in the local shell and was absent from the EAS `preview` and `production` project environment listings.
- Mobile API mode requires an explicit URL; it has no production fallback. See `apps/mobile/src/api/config.ts` and `apps/mobile/docs/mobile-security-closure.md`.
- The supplied `ryczalt-it-ui-5411614898.europe-central2.run.app` host returns the customer web sign-in page. A read-only GET to `/api/v1/auth/me` redirects to its `/login` form; this establishes it as the web host, not the mobile backend API origin.
- No credentials were submitted and no accounting API requests were made. The backend API origin remains unknown; no URL was inferred or configured.
