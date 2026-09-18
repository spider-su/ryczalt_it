# Mobile accounting status contract

This inventory follows the current `AccountingMobileResponse` DTO and the mobile mapper. Mobile presents these backend values and does not calculate accounting truth.

| Backend field | Domain mapping | Mobile presentation | Unknown behavior | Screen |
| --- | --- | --- | --- | --- |
| `lifecycle`, `lifecycleLabel`, `nextAction`, `nextActionLabel` | Preserved on `AccountingMonth` as raw workflow context | Not promoted to Home; current obligations and backend issues remain primary | Raw values remain available; no guessed label | Domain/Home context |
| `allowedActions` | Preserved on `AccountingMonth.status.allowedActions` | Not rendered as executable controls | Never creates a mobile action | Domain |
| `sources` | Preserved in `AccountingMonth.status.sources` | Not shown as a statistics dashboard | Missing values remain unavailable | Domain |
| `ksefStatus` | Preserved as raw string | `CONNECTED` and `NOT_CONFIGURED` map to localized system status | Other values show neutral unavailable status | Więcej |
| `documentSummary` | Preserved in `AccountingMonth.status.documentSummary` | Not shown separately; document list remains the useful view | Missing values remain unavailable | Domain |
| `bankSummary` | Maps to `matched`, `unmatched`, `pending`, `failed`, `unavailable`, or `unknown` | Więcej → Połączone systemy | Zero transactions does not imply disconnected | Więcej |
| `reconciliationSummary` | Maps to `healthy`, `mismatch`, `missing_evidence`, or `unknown` | Rozliczenia status section | Incomplete counters remain unknown | Rozliczenia |
| `filingSummary` | Preserves lifecycle, readiness, issues, JPK and UPO fields | Rozliczenia shows filing, JPK, UPO and reconciliation statuses | Unknown artifact values remain neutral | Rozliczenia |
| `paymentSummary` | Existing payment mapping preserves decimal amounts and independent history | Existing obligations/history UI | Null amount remains unavailable | Rozliczenia |

## Documents

`sourceType`, `sourceTypeLabel`, `importStatus`, `reviewStatus`, `paymentStatus`, `documentKind`, `correctsDocumentId`, and `correctsDocumentReference` are preserved on `AccountingLine`.

- `importStatus` controls processing state.
- `reviewStatus` controls review attention.
- `paymentStatus` remains a separate payment dimension.
- Legacy `status` is not interpreted as accounting approval or import success.
- KSeF document status is shown only when the document source type is `KSEF`.
- Correction references are displayed in document details; no correction calculation or navigation is invented.

## Backend values observed

The adjacent backend currently emits `CONNECTED` / `NOT_CONFIGURED` for KSeF provider status, `IMPORTED` / `NO_IMPORT` for the mobile bank summary, filing artifact statuses such as `MISSING`, `GENERATED`, `VALID`, `INVALID`, and `SUBMITTED`, and UPO statuses such as `MISSING`, `ACCEPTED`, `REJECTED`, and `POSTED`. The mobile mapper treats all other values as unknown.

No bank matching, KSeF setup, filing submission, UPO retrieval, tax calculation, or new API endpoint was added.
