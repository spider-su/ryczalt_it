# Accounting backend consistency gaps

These are contract gaps observed by the mobile client. They are not inferred
or repaired by client-side accounting rules.

## Payment status

- Observed behavior: canonical obligations and payment-history
  status may be `UNKNOWN`/null while amount, paid amount, and outstanding
  amount are present.
- Current field: `status` is carried through the DTO and mapper without
  client inference.
- Why mobile cannot infer it: equal amount and zero outstanding do not prove
  the backend's authoritative domain state for reminders or settlement.
- Required backend behavior: emit a documented canonical status when the
  authoritative payment state is known, and keep unknown values explicit.
- Release impact: mobile remains safe but may show “Status unavailable”.
- Safe mobile fallback: do not infer `PAID`; use unavailable copy and keep
  reminder eligibility conservative.

## Invoice payment status

- Observed behavior: canonical invoice `paymentStatus` is nullable and
  may be absent from document responses.
- Current field: the mapper preserves `paymentStatus` as nullable/raw.
- Why mobile cannot infer it: invoice amount, dates, bank data, and
  reconciliation counts are not an explicit document payment contract.
- Required backend behavior: expose a documented canonical document payment
  status when reconciliation has authoritative evidence.
- Release impact: compact invoice rows omit unavailable secondary status;
  details may show that payment status is unavailable.
- Safe mobile fallback: no inferred paid/unpaid state.

## Invoice source metadata

- Current endpoint: `GET /api/profiles/{profileId}/accounting/periods/{month}/invoices`.
- Current limitation: canonical `InvoiceResponse` does not expose the invoice source type or source-specific external reference, so mobile cannot determine whether an invoice came from KSeF.
- Required minimal backend fields: nullable `sourceType` and `sourceReference` (or a documented equivalent such as `sourceExternalId`).
- Why: these fields are needed for a truthful source badge and source identity in the invoice list.
- Safe mobile fallback: use a generic invoice icon with the invoice reference and date; never infer KSeF from the invoice number or other state.

## Invoice bookkeeping status

- Current limitation: canonical `InvoiceResponse` exposes approval and payment state but no bookkeeping/accounting status.
- Why mobile cannot infer it: approval status is not bookkeeping status, and payment status is unrelated to whether the invoice has been booked.
- Required backend capability: a stable documented `accountingStatus` field with explicit enum semantics.
- Safe mobile fallback: show an approval-specific badge only; do not display “booked” or “not booked”.
