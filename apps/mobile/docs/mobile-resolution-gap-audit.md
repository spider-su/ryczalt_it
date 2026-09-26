# Mobile resolution gap audit

Audited against the current mobile DTO/domain contract and the deployed-backend source available in the adjacent Investory repository. This stage adds no backend endpoints and does not execute accounting commands locally.

| Resolution value | Meaning | Mobile target | Classification | Notes |
| --- | --- | --- | --- | --- |
| `NONE` | Backend has no safe mobile action | Issue details | `DISPLAY_ONLY` | The backend reason may be shown only through safe localized presentation. |
| `SETUP` | Setup/settings action | No matching mobile accounting-settings screen | `DISPLAY_ONLY` | Current `settingsPath` points to the web accounting workspace. |
| `CHOICE` | Backend option choice | No command executor or persistence UI | `BACKEND_COMMAND_NOT_EXPOSED` | Options are preserved in the DTO but are not submitted by mobile. |
| `MATCH` | Backend match/candidate choice | No command executor or persistence UI | `BACKEND_COMMAND_NOT_EXPOSED` | No local reconciliation or matching logic added. |
| unknown | Contract value not known to mobile | Issue details only | `UNKNOWN` | No command or navigation is guessed. |

## Source-reference contract classification

The general relationship `Issue.sourceReference -> Invoice.source` is classified as `AMBIGUOUS_CONTRACT`. Backend evidence shows that `SOURCE_*` issues are created from source evidence references. Other issue kinds are not safe to route this way: examples include invoice references for calculation issues, bank transaction references for reconciliation issues, and null account-level references.

Therefore mobile supports only this fail-closed subset: for a `SOURCE_*` issue, a non-empty reference must exactly equal one loaded invoice's source. No fuzzy matching, invoice-reference matching, or heuristic fallback is used. A matching reference on any other issue code remains display-only.

## Known gaps

- `SETUP` currently targets a web accounting workspace; mobile has no equivalent accounting settings destination.
- `CHOICE` and `MATCH` require backend command execution and authoritative refresh support that mobile does not currently expose.
- The backend does not currently declare a universal issue-reference namespace or an explicit issue-to-document identifier field. Non-`SOURCE_*` issue references remain a contract gap.
- No mobile action executes an accounting-affecting backend command in this stage.

## Production V1 blockers

No new backend blocker was introduced. Accounting decisions, reconciliation choices, setup changes, and match selections remain backend-owned and are explicitly unavailable in mobile until a later Resolution Commands stage.
