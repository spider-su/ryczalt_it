# Mobile automation settings contract

## Backend API

The mobile client uses the existing authenticated profile-scoped endpoints:

- `GET /api/v1/profiles/{profileId}/accounting/auto-approval`
- `PUT /api/v1/profiles/{profileId}/accounting/auto-approval`

The response and PUT payload are:

```json
{
  "enabled": true,
  "maxAmount": "1000.00",
  "trustedCategories": ["ACCOUNTING_SERVICE"]
}
```

`maxAmount` is a non-null decimal serialized as a string. The current backend rejects negative amounts and blank category values. The backend does not expose a category-options endpoint; category values are canonical strings and are round-tripped unchanged.

## Mobile ownership boundary

Mobile owns loading, editing, validation of the transport shape, localized explanation, and save/error presentation. The backend remains authoritative for eligibility, approval, reconciliation, tax treatment, evidence requirements, and accounting consequences. Mobile does not decide whether a document is safe or approved.

The profile ID comes from the existing authenticated `/api/v1/auth/me` profile-resolution flow. No profile ID is hardcoded and no profile-switching behavior was added.

## Save behavior

The screen uses an explicit Save button:

`GET → editable draft → PUT → GET refresh → authoritative displayed state`

The Save button is disabled when unchanged or while saving. A successful PUT followed by a failed refresh is reported as an unconfirmed state; the app does not claim that the displayed settings are authoritative.

Disabling automation preserves `maxAmount` and `trustedCategories` in the draft and payload. The backend decides whether those values have any effect while disabled.

## Unknown and error handling

Malformed GET/refresh responses are failures, not disabled automation. HTTP authorization, validation, network, timeout, PUT failure, and refresh failure remain distinct in the settings presentation. Unknown category strings remain visible in the canonical comma-separated editor and are not silently removed or translated.

## Issue integration

No Issue `SETUP` route was added. Current backend `settingsPath` values point to the accounting workspace and do not demonstrate a specific automation-settings destination. Generic accounting paths are not mapped heuristically.

## Live safety

No live write calls or live workflow changes were made. PUT behavior is covered by client/domain tests only.
