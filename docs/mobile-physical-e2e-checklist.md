# Mobile physical E2E checklist

This checklist is intentionally separate from automated repository validation. It must be run on a fresh preview/release native build with a safe test account and real backend credentials. Do not record credentials, tokens, invoice contents, or notification payloads.

## Device matrix

- Android: 3-button navigation, gesture navigation, narrow screen, large text.
- iOS: home indicator, keyboard, large text.
- Network: normal, offline, slow, restored.

## Journey

- Fresh install → startup loading → Polish default → login.
- Invalid credentials, repeated login tap, slow/offline login.
- Home real data, loading, attention, empty/unavailable, month switching.
- Faktury: search, All/Sales/Purchases/filter, scroll, details, missing values, source/KSeF/review/payment/correction.
- Rozliczenia: PPE/VAT/ZUS, total, details, payment history, month switching, independent history failure.
- Więcej: systems, settings, automation, notifications, logout.
- Automation: load, edit, save, reload, authoritative persistence, failure state.
- Notifications: permission, 1/3/7-day setting, one reminder only, refresh without duplicate, resolved-payment cancellation, locale change.
- Reminder tap: foreground, background, terminated → authenticated startup → Rozliczenia.
- Force-close/restart from Home, Faktury, Rozliczenia, Automation, Notifications.
- User A logout → User B login: no financial data, profile, drafts, or reminders leak.

## Layout/accessibility gate

- Android 3-button and gesture safe area; central `+` and tab labels above system UI.
- iOS safe area; final list content not obscured.
- Keyboard does not cover login/search/automation/notification actions.
- PL and EN long strings wrap; large text does not clip or overlap.
- Screen-reader labels, selected/busy/disabled states, and touch targets are usable.

## Evidence

Record device/OS/build identity, scenario, result, and a sanitized screenshot or log reference. Physical verification is currently pending because no Android device/emulator or iOS device is available in the repository environment.
