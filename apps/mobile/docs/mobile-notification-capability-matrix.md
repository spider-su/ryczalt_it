# Mobile notification capability matrix

| Capability | Current support | Location | Classification | Notes |
|---|---|---|---|---|
| Notification permission | Yes, opt-in | `src/notifications/notificationService.ts` | MOBILE_ONLY | Requested from More → Notifications, never at startup. |
| Local scheduling/cancellation | Yes | `notificationService.ts` | MOBILE_ONLY | Expo Notifications; stable profile/payment/period identity. |
| Payment due-date reminders | Yes | `paymentReminders.ts` | MOBILE_ONLY | Uses only known backend payment statuses and valid backend calendar dates. |
| Rescheduling/reconciliation | Yes | `notificationService.ts` | MOBILE_ONLY | Reconciles the viewed period; unseen months are preserved. |
| Notification tap routing | Partial | notification payload | MOBILE_ONLY | Payload targets Rozliczenia; physical cold-start navigation remains to verify. |
| Device/push token registration | No | — | BACKEND_EXTENSION_REQUIRED | No authenticated mobile device registration contract found. |
| Server attention push | No | — | BACKEND_EXTENSION_REQUIRED | Admin notification APIs are not a mobile-user push contract. |
| Notification preferences sync | No | — | MOBILE_ONLY | Payment reminder preference is device-local by design. |
| Notification history/feed | No | — | DEFER | No user notification-history contract. |
| Logout cleanup | Yes | `AuthContext` + service | MOBILE_ONLY | Profile-scoped reminders are cancelled before session invalidation. |
| Profile isolation | Yes | service keys/payload | MOBILE_ONLY | Uses authenticated `profileId`; no fixed profile identifier. |
| Locale behavior | Yes | service reconciliation | MOBILE_ONLY | Locale is part of reminder identity, so future reminders are recreated. |
| Badge counts | No | — | DEFER | No authoritative unread count. |
