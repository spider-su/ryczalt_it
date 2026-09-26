# Privacy policy draft — legal review required

This file is a content checklist, not a published legal notice. Replace the
operator identity, contact details, retention periods, legal bases, and user
rights process before publishing it at the public privacy URL in
`docs/store-metadata.md`.

Investory Accounting processes account and accounting information to provide
the application, including authentication data, profile data, invoices,
periods, payment statuses, and tax/ZUS information returned by the operator's
accounting service. Access tokens are stored in the device secure storage.

The app can schedule reminders locally on the device. It does not use server
push for those reminders. Optional Face ID, Touch ID, or Android biometrics
are evaluated by the operating system; the app receives only the unlock result
and does not receive or upload biometric templates.

Crash monitoring is disabled until the operator configures Sentry. When enabled,
the app is configured not to send default personally identifying information;
the operator must document the resulting technical data, retention, processor,
and user-rights process in the published policy.

The app contains no advertising or tracking implementation. Demo mode uses
local sample data and does not represent a user's live accounting account.
