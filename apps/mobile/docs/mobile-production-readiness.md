# Mobile production readiness

## Baseline

- Starting SHA: `c4bf9a22eb0bfdf65c69115adc3c3bfcf5b07537`
- Branch: `develop`, fast-forwarded to `origin/develop`
- Baseline validation: 16 test files / 62 tests passed; typecheck passed; `git diff --check` passed.
- Lint: no lint script is configured.

## Findings and decisions

| Area | Scenario | Observed risk | Classification | Decision |
|---|---|---|---|---|
| Startup | Secure session/profile restoration takes time | `AppContent` returned a blank screen while auth or locale initialized. | P1 | Fixed with explicit startup loading UI. |
| Notification navigation | Cold-start reminder response arrives before `NavigationContainer` is ready | Tap route could be discarded. | P1 | Fixed with allowlisted pending `Payments` navigation flushed from `onReady`. |
| Notification privacy | Scheduled-record storage is missing/corrupt at logout | Cleanup based only on AsyncStorage records could leave OS notifications. | P0 | Fixed by also scanning scheduled notifications by profile metadata/identifier and best-effort cancelling both layers. |
| Notification permission | OS permission is revoked after local preference is enabled | Settings could imply reminders still work. | P1 | Fixed by checking OS permission on settings load and showing a localized unavailable state. |
| Accounting calendar | Current month was derived with UTC `toISOString()` | Around local month boundaries, selected/default month could be one month wrong. | P1 | Fixed with local calendar month construction. |
| Session/profile | Login persists token only after `/auth/me` resolves | No old profile is used for a new login; logout invalidation is centralized. | No defect found | Preserved and regression-risk documented. |
| API concurrency | Screen effects use active guards | Late responses do not update unmounted/old screen state. | No defect found | No broad request rewrite. |
| Server push | Backend exposes admin notification infrastructure, not mobile device registration/user push | Connecting mobile to admin APIs would be unsafe and semantically wrong. | DEFERRED_CAPABILITY | Preserved `docs/mobile-push-backend-gap.md`; no polling or fake push. |
| Device/native behavior | OS scheduling, permission prompts, background/cold-start timing | Not reproducible in the repository test environment. | DEFERRED_CAPABILITY | Physical Android/iOS verification required. |

## Reliability invariants reviewed

- Unknown, missing, failed, and pending accounting values remain distinct from success/zero/empty.
- Payment reminder eligibility accepts only known obligation types and backend-known unresolved statuses.
- Reminder dates use local calendar construction at 09:00; invalid dates and past schedules are skipped.
- Reminder reconciliation is profile-scoped, period-scoped, idempotent, and does not cancel unseen months.
- Logout clears the authenticated profile and attempts to remove profile-local scheduled notifications.
- Notification payload routes are allowlisted; arbitrary route values are ignored.
- Canonical money remains decimal-string based; no new floating-point accounting arithmetic was introduced.

## Deferred release risks

- The mobile/API timeout remains the intentional temporary `180_000 ms` policy. Backend latency should be measured before changing it.
- No user-facing server push contract exists: device registration, token lifecycle, user event selection, deduplication, and delivery remain backend work.
- Native notification permission, reboot behavior, timezone/DST, 3-button/gesture safe area, keyboard, and real background/foreground transitions require installed-device QA.
- No offline accounting cache was added; backend remains authoritative.
