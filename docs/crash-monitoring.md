# Crash monitoring

The app uses Sentry for production crash and error monitoring. The SDK is
installed through the Expo config plugin and is initialized only when a DSN is
provided and the app is not running in development mode.

## EAS setup

Create a Sentry project, then configure these EAS environment variables for
the `preview` and `production` environments:

- `EXPO_PUBLIC_SENTRY_DSN` — non-secret client DSN
- `SENTRY_AUTH_TOKEN` — secret organization token used for source-map upload
- `SENTRY_ORG` and `SENTRY_PROJECT` — source-map release metadata used by the
  Sentry Expo plugin when configured in EAS

The DSN is intentionally not stored in git. Without it, the app builds and
continues to run, but no crash events are sent. Do not put `SENTRY_AUTH_TOKEN`
in `EXPO_PUBLIC_*` variables or in the repository.

## Verification gate

After configuring the variables, create a new EAS build, trigger a controlled
test exception in a private review build, and confirm the event appears with a
symbolicated stack trace. Remove or disable the test trigger before store
submission. Confirm that no authentication token, invoice payload, or other
financial content is attached as user-identifying context.
