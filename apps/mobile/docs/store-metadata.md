# Store metadata and review setup

This is the release draft for Apple App Store and Google Play. Public URLs
must be hosted by the product owner before submission; repository paths are
not valid privacy-policy or support URLs in either store.

## Listing draft

- App name: Investory Accounting
- Short description: Polish accounting deadlines and invoices in one place.
- Full description: Investory Accounting helps Polish sole traders review
  accounting periods, upcoming tax and ZUS payments, received invoices, and
  payment status. It supports Polish and English, demo data for evaluation,
  local payment reminders, and optional biometric unlock on supported devices.
- Category: Finance / Business
- Primary language: English (Polish localization is included)
- Target audience: Adults managing sole-trader accounting information
- Ads: None
- In-app purchases: None

## Required public links

Replace these placeholders with HTTPS URLs on the product domain:

- Privacy policy: `https://REPLACE_WITH_PUBLIC_DOMAIN/privacy`
- Support: `https://REPLACE_WITH_PUBLIC_DOMAIN/support`
- Terms of use: `https://REPLACE_WITH_PUBLIC_DOMAIN/terms`

The privacy policy must describe the live backend data processed by the app,
SecureStore token storage, local notifications, optional biometrics, retention,
deletion/contact handling, and the controller/operator identity. The draft must
receive legal/product-owner approval before publishing.

## Data-safety answers to prepare

- Account/authentication data: email or login identifier and authentication
  token; used for account access and app functionality.
- Financial/accounting data: invoices, tax periods, payments, and profile
  data returned by the accounting API; used for app functionality.
- Device data: local notification schedules and biometric preference; stored
  on the device. Biometric templates are handled by the operating system and
  are not sent to the app backend.
- Crash data: only after `EXPO_PUBLIC_SENTRY_DSN` is configured; Sentry is
  initialized with `sendDefaultPii: false`.
- Tracking/advertising: none implemented.
- Server push: not implemented; reminders are local device notifications.

## Review instructions

1. Install the production or preview build.
2. Choose **Try demo** to review the full UI without backend credentials, or
   use the separately supplied review account for the API-backed flow.
3. Open **Payments** to review upcoming tax/ZUS items and manual paid state.
4. Open **More > Settings** to review language, theme, notifications, and
   optional biometric unlock.
5. To test a notification, enable reminders and use a test payment date in the
   review environment; do not expect server push.

Before submission, add the real review-account credentials to the store
console's private review fields, confirm that the review backend is reachable,
and remove any temporary test data from the account.
