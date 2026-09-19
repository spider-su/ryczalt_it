# Accounting backend consistency gaps

These are contract gaps observed by the mobile client. They are not inferred
or repaired by client-side accounting rules.

## Payment status

- Observed behavior: `paymentSummary.payments[].status` and payment-history
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

## Document payment status

- Observed behavior: `AccountingDocumentDto.paymentStatus` is nullable and
  may be absent from document responses.
- Current field: the mapper preserves `paymentStatus` as nullable/raw.
- Why mobile cannot infer it: invoice amount, dates, bank data, and
  reconciliation counts are not an explicit document payment contract.
- Required backend behavior: expose a documented canonical document payment
  status when reconciliation has authoritative evidence.
- Release impact: compact invoice rows omit unavailable secondary status;
  details may show that payment status is unavailable.
- Safe mobile fallback: no inferred paid/unpaid state.
