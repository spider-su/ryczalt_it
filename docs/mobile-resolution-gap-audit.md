# Mobile resolution gap audit

Audited against the current mobile DTO/domain contract and the deployed-backend source available in the adjacent Investory repository. This stage adds no backend endpoints and does not execute accounting commands locally.

| Resolution value | Meaning | Mobile target | Classification | Notes |
| --- | --- | --- | --- | --- |
| `NONE` | Backend has no safe mobile action | Issue details | `DISPLAY_ONLY` | The backend reason may be shown only through safe localized presentation. |
| `SETUP` | Setup/settings action | No matching mobile accounting-settings screen | `DISPLAY_ONLY` | Current `settingsPath` points to the web accounting workspace. |
| `CHOICE` | Backend option choice | No command executor or persistence UI | `BACKEND_COMMAND_NOT_EXPOSED` | Options are preserved in the DTO but are not submitted by mobile. |
| `MATCH` | Backend match/candidate choice | No command executor or persistence UI | `BACKEND_COMMAND_NOT_EXPOSED` | No local reconciliation or matching logic added. |
| unknown | Contract value not known to mobile | Issue details only | `UNKNOWN` | No command or navigation is guessed. |

## Supported navigation

An issue can open existing Document Details when its non-empty `sourceReference` exactly matches an existing document's `source` value in the loaded accounting month. This is the only demonstrated source relationship used by mobile.

## Known gaps

- `SETUP` currently targets a web accounting workspace; mobile has no equivalent accounting settings destination.
- `CHOICE` and `MATCH` require backend command execution and authoritative refresh support that mobile does not currently expose.
- No mobile action executes an accounting-affecting backend command in this stage.

## Production V1 blockers

No new backend blocker was introduced. Accounting decisions, reconciliation choices, setup changes, and match selections remain backend-owned and are explicitly unavailable in mobile until a later Resolution Commands stage.
