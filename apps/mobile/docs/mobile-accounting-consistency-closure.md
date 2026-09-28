# Mobile accounting presentation closure

## Home semantics

`summary.ryczalt`, `summary.vat`, and `summary.zus` remain tax-summary values.
`paymentSummary.totalOutstanding` is the separate amount currently
outstanding. Mobile never adds the three summary values or presents them as
the payable total. Exact decimal zero is detected from the canonical string,
so `0`, `0.0`, `0.00`, and `-0.000` receive restrained zero treatment.

## Documents and month filtering

The mobile document accounting date is the mapped `issueDate`, falling back to
`saleDate` when issue date is absent. The default range is the selected
accounting month. Previous month and last three months are explicit ranges;
direction, payment status, currency, and search filters remain independent.
The current API client requests the corresponding month window, and the
mobile layer enforces the range using the mapped date.

## Money display

Money strings remain exact in the model and mapper. Display trims only
insignificant trailing fractional zeroes beyond normal currency precision,
keeps at least two digits for PLN/EUR, and preserves meaningful extra
precision such as `388.1456`. No floating-point conversion is used.

## Status and unknown values

Reconciliation is labelled as data reconciliation and remains independent of
lifecycle, filing, JPK, and UPO. Unknown payment and invoice payment statuses
are not inferred from amounts, dates, or reconciliation. The UI uses
restrained unavailable wording where the backend does not provide an
authoritative status.

## Design-system migration

Core screens use shared sections, list groups, key/value rows, month
navigation, segmented controls, search, sheet headers, settings rows, form
fields, and primary actions. Automation and Notifications now use the same
settings-sheet family. Physical-device verification remains a release gate.

## Android stabilization follow-up

- The backend `outstandingAmount` is a monetary balance. An exact zero balance
  is displayed as settled even if a stale or contradictory payment status and
  due date would otherwise label it overdue. Null and positive balances retain
  their source status semantics.
- Outstanding summaries include overdue unpaid obligations and never combine
  values with different or missing currencies. If a single currency cannot be
  established, the total is shown as unavailable.
- Home preserves previously loaded data for a section whose refresh fails,
  surfaces that section's error and retry, and keeps setup-status retry
  independent from accounting-data refresh.
- Home and Settlements use the same overall period status, including unresolved
  reconciliation. Settlements keeps detailed component statuses expandable;
  More no longer duplicates an incomplete-only health label.
- The current backend source has no `/api/profiles/{profileId}/accounting/readiness`
  or `/api/profiles/{profileId}/onboarding` route. Setup-status load errors remain
  visible and retryable until that authoritative setup contract exists. Mobile
  does not synthesize configuration success.
- Android content density was reduced in shared page headers, section spacing,
  month controls, invoice rows, and bottom navigation. Counterparties opens as a
  full-screen modal destination with Android back handling; biometric controls
  now live in Settings.
