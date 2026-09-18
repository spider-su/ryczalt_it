# Mobile push backend gap

The current backend notification surface is admin-oriented (`/api/v1/admin/notifications`) and includes existing integration delivery such as Telegram. It does not expose a verified authenticated mobile-user contract for device registration, token rotation/removal, profile association, user notification preferences, delivery identity, or durable user notification history. The mobile app therefore does not call those admin endpoints and does not simulate push through polling.

## Smallest required backend capability

1. Authenticated register/update device: user/profile identity, platform, app environment, and push token.
2. Authenticated unregister device: stable device identity or token.
3. Backend-owned event selection for actionable `NEEDS_ANSWER`, `SETUP`, and `BLOCKED` changes; `INFO` should normally remain silent.
4. Stable event/delivery identity and deduplication.
5. Localized, privacy-safe payload or a documented semantic payload that the mobile app can render without raw issue codes.
6. Safe handling of logout, token rotation, profile isolation, and delivery failure.

This is a backend extension, not implemented in this mobile stage. Admin notification APIs are not evidence of this contract.

## Local reminder boundary

Payment reminders are device-local and use only the current mobile `PaymentLine` data. The app schedules at 09:00 in the device's local timezone, with a 3-day default lead time and user choices of 1, 3, or 7 days. Invalid/missing dates, unknown statuses, resolved statuses, and unknown obligation types are not scheduled. Amounts are intentionally omitted from lock-screen copy. The app currently receives one accounting month at a time, so reconciliation only changes records for the refreshed period and does not cancel reminders for unseen periods.
