import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
let initialized = false;

export function initializeCrashMonitoring() {
  if (initialized || !dsn || __DEV__) return;

  Sentry.init({
    dsn,
    enabled: true,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0,
  });
  initialized = true;
}

export function captureAppException(error: Error, context?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
