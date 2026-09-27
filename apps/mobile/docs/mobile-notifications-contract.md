# Mobile notifications contract

## Local payment reminders

Local reminders are opt-in and device-local. The backend remains authoritative for payment status, obligation type, amount, and due date. Mobile schedules only known PPE/VAT/ZUS obligations with valid `YYYY-MM-DD` dates and known unresolved statuses. Unknown or resolved status, unknown obligation type, missing/invalid due date, and past reminder time are not scheduled.

The supported lead time is 1, 3, or 7 days; the default is 3 days. The notification is scheduled at 09:00 in the device's local calendar timezone. Lock-screen copy omits amount and sensitive document details. Reminder identity includes authenticated profile, period, obligation identity, due date, lead time, and locale.

Reconciliation is idempotent and only changes records for the refreshed period. It cancels resolved/removed/changed reminders and does not cancel unseen months. Logout attempts to cancel both stored and OS-scheduled profile reminders. Notification tap targets only the allowlisted `Payments` route after locale, session, profile, and navigator readiness.

## Server push

No authenticated mobile device-registration or user push-delivery contract is currently exposed. Admin notification endpoints are not used. Server-driven attention push remains deferred; mobile does not poll or simulate push.

## Physical verification

Permission revocation, OS scheduling, app restart, foreground/background behavior, cold-start tap routing, timezone/DST, and account-switch privacy require physical-device validation using the checklist in `mobile-physical-e2e-checklist.md`.
