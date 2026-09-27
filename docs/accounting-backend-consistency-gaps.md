# Accounting REST contract notes

These notes record contract gaps verified against the local backend checkout
(`develop`, starting SHA `ad5161b761080652a281b344380201cecbd807d9`) and mobile
behavior. They are not accounting rules and are not repaired through client
inference.

## Closed: invoice provenance and classification

`InvoiceResponse` exposes nullable `sourceType`, `sourceReference`, and
`classification`; the backend OpenAPI contract test asserts both provenance
fields. Mobile maps those fields to invoice source type, source reference, and
category. KSeF presentation is shown only when `sourceType` is explicitly
`KSEF`; no invoice number or status is used as a proxy.

## Remaining: invoice counterparty NIP search

The canonical invoice response's nested counterparty currently contains only
`id`, `legalName`, and `alias`. It does not expose `taxIdentifier`, so mobile
cannot truthfully offer NIP search for these invoices and its search hint has
been narrowed to counterparty name or invoice number.

Backend follow-up: consider adding `taxIdentifier` to `InvoiceResponse`'s
nested counterparty view and OpenAPI contract. The invoice query already
constructs that view from its counterparty read model; verify query/fetch
behavior remains bounded before exposing it. Until then, NIP invoice search is
deferred (counterparty directory search is a separate API).

## Remaining: explicit bookkeeping status

The invoice REST response exposes approval, payment, and verification states,
but no authoritative accounting/bookkeeping status. Approval is not booking,
and payment is not booking. Mobile therefore renders the available concepts
separately and does not display “Booked” / “Zaksięgowano”.

## Defensive mobile fallback: missing monetary amounts

Mobile preserves any null monetary value and presents “Amount unavailable” /
“Kwota niedostępna”; it does not derive gross from net plus VAT. The backend
invoice entity declares `gross_amount` non-null, as does the obligation entity's
`amount`. If an actual response contains null for either guaranteed amount,
investigate the deployed schema/data and response mapper on the backend rather
than treating null as a valid zero or repairing it in the client.

## Verified obligation amount guarantee

`RyczaltObligationEntity.amount` is declared non-null, and the canonical
obligation query uses that amount as `expectedAmount`. Mobile still models the
wire amount as nullable defensively, but displays a null as “Amount
unavailable”, never as zero or “no payment due”.

## Calculation refresh and lifecycle

The backend provides bodyless `POST
/api/profiles/{profileId}/accounting/periods/{month}/calculate`; mobile exposes
an explicit action only for `DIRTY_CALCULATION`, then reloads the period and
its invoice, transaction, obligation, and issue resources. The canonical
lifecycle actions are `FREEZE` and `REOPEN`; there is no `/settle` endpoint.

Calculation was not posted to production during QA. Demo mode does not issue
server mutations.
