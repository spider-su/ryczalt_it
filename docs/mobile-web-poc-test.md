# Web POC test checklist

Use Chrome desktop with DevTools → Toggle device emulation enabled. Test with a
safe account and do not record credentials, tokens, invoice contents, or
screenshots containing financial data.

## Start

API mode against the deployed backend:

```bash
EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE=api npm run web
```

API mode against a local backend:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080 \
EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE=api \
npm run web
```

Mock mode for UI-only checks:

```bash
EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE=mock \
EXPO_PUBLIC_ACCOUNTING_MONTH=2026-07 \
npm run web
```

After changing environment variables, restart Expo. In Chrome DevTools select
an iPhone or narrow Android preset, enable responsive mode, and test both
narrow and wide layouts.

## Minimum journey

- Startup loading and sign-in; invalid credentials and repeated submit.
- Home: current month, previous month, next-month limit, attention state, and
  unavailable/error state.
- Faktury: search, direction filters, date range, document details, and empty
  results.
- Rozliczenia: tax obligations, status filters, payment history, and separate
  history failure behavior.
- Więcej: language switch, automation GET/edit/PUT/refresh, notifications, and
  logout.
- Add Cost: file selection, recognition, backend-provided choices, validation,
  duplicate response, and successful staging.
- Refresh the browser on every main screen and verify state does not leak
  between logout and the next login.

## Web-specific limitations

Browser notification permission and native background/cold-start behavior are
not release evidence. Treat local reminder scheduling as a smoke check only;
native notification behavior still requires a device build.

Record only scenario, result, browser/device preset, build timestamp, and a
sanitized error reference.
