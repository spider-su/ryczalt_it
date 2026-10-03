# Active native calculation rules

The active month calculation path is `RyczaltAccountingFacade` →
`NativeMonthCalculationService`. It combines the pure calculators with normalized facts, persists
revisioned results, updates obligations, and runs settlement. The pure calculators do not classify
source documents, fetch exchange rates, or infer missing accounting inputs.

These rules implement the currently supported 2026 JDG profile. They are not general-purpose
calculators for every Polish tax configuration. In particular, the currently supported product
profile is JDG, 12% ryczałt, monthly PIT, active VAT and monthly VAT; unsupported combinations must
be rejected or remain unavailable.

## Ryczałt

`RyczaltRules2026` applies revenue supplied by numeric rate bucket. Buckets are processed in numeric
rate order, so input map insertion order cannot change the result. Paid social contribution
deduction and 50% of paid health contribution are reduced by deductions already consumed, then
allocated proportionally across revenue buckets. The last bucket receives the rounded remainder.
Each taxable bucket is rounded to whole PLN before tax is calculated and rounded; unused deduction
is returned as carry-forward by the pure result. Input amounts and rates are validated at the
normalized-input boundary.

## VAT

`VatRules2026` adds signed sales corrections before rounding output VAT. Explicit adjustments,
deductible input VAT, and prior carry-forward are separately rounded to whole PLN. Payable VAT is
floored at zero; excess eligible input is returned as `excessVatCarryForward` for a later period.
The first managed month requires an explicit opening carry-forward, including explicit zero. Later
months require the previous month's current VAT calculation and a valid numeric carry-forward; a
missing, stale, malformed, or negative value is incomplete, never zero by default.

## ZUS

`ZusRules2026` is intentionally limited to the supported JDG cases. An active JDG without qualifying
UoP pays full JDG social contributions and optionally voluntary sickness; qualifying UoP removes JDG
social contributions in this layer but retains the applicable health band. An inactive JDG pays zero.
Health bands use year-to-date ryczałt revenue after actual paid social contributions: low through
PLN 60,000, medium through PLN 300,000, then high. Opening YTD values anchor the first managed
month; only approved income invoices from the configured start date onward are added, so earlier
imports are not double counted. Cumulative revenue is recomputed from facts, not persisted as a
derived month-input value. Actual paid social and health amounts are separate from amounts due;
explicit zero is valid, while missing payment facts block calculation.
Unused deductible contributions are carried from the previous current ryczałt result; first-month
opening paid contributions (less opening deductions already consumed) seed that carry-forward.

## Opening state and supported inputs

The existing `ryczalt_native_month_input` row for the accounting start month stores the start date
and explicit opening YTD revenue, paid social, paid health, consumed deductions, and VAT
carry-forward. All opening values are required and non-negative; `NULL` means unconfigured and
numeric zero means known zero. Opening values are facts, not fake invoices/payments. Calculation
before the start month, without opening state, or without monthly paid social/health facts fails as
`NEEDS_REVIEW`. Only 2026 and `zusRegime: JDG` are supported. Voluntary sickness requires active JDG
primary insurance; Ulga na start, preferential ZUS, and Mały ZUS Plus are unsupported.

Historical invoice, VAT, contribution, and opening-state changes invalidate dependent calculation
types from the earliest affected month forward. The lifecycle preflights the dependency chain; when
a current dependent calculation is frozen, the mutation fails until that period is explicitly
reopened.

## Rounding policy

| Operation | Scale | Mode |
| --- | ---: | --- |
| FX amount | 2 | HALF_UP |
| ZUS contribution | 2 | HALF_UP |
| health deduction | 2 | HALF_UP |
| deduction allocation | 2 | HALF_UP |
| ryczałt taxable bucket and tax | 0 | HALF_UP |
| VAT settlement component | 0 | HALF_UP |

Use the named operation in `RoundingPolicy`; do not treat calculation rounding as display formatting.

## Regression-test map

| Layer | Test class | Coverage |
| --- | --- | --- |
| ryczałt | `RyczaltCalculatorTest` | rate buckets, order independence, deduction carry-forward, paid-health deduction, already-consumed deductions, proportional allocation and whole-PLN threshold |
| VAT | `VatCalculatorTest` | correction order, rounding boundaries, adjustments, payable floor and excess-input carry-forward |
| ZUS | `ZusCalculatorTest` | active/inactive JDG, qualifying UoP, voluntary sickness, explicit persisted amounts, health-band boundaries and paid-health override |
| Orchestration | `NativeMonthCalculationServiceTest` | all three calculations, obligation creation, persisted prior-period VAT carry-forward, invalid prior VAT snapshot rejection, explicit no-revenue requirement and supported 12% rate enforcement |
| Aggregation | `NativeMonthInputAggregatorTest` | approved invoice grouping, missing income rate rejection, foreign-currency booked PLN input, and opening revenue/contribution/deduction/VAT carry-forward |
| Mobile readiness | `RyczaltMobileReadinessServiceTest` and `RyczaltMobileReadinessRestControllerTest` | profile-scoped persisted readiness, explicit audited no-revenue confirmation and rejection of unsupported activity confirmation |
| Reference parity | `HappyInvestorCalculationTest` and backend certification tests | captured normalized reference values; see `src/test/resources/certification/2026/README.md` |

These are unit tests and run without Docker. Database locking, persistence revisions, and transactional
behavior are covered separately by integration tests (`*IT`).

## Persistence compatibility and open debt

The opening-state contract is persisted on the configured start month. Every opening amount is
required, including explicit zeroes. Aggregation rebuilds YTD revenue from approved PLN-booked
income invoices and opening YTD revenue, and requires actual monthly contribution payment facts.
Missing opening or monthly facts, missing current prior-period calculations, and unsupported tax
rates fail explicitly. The readiness endpoint reports those persisted gaps without substituting
zeroes. This source-level closure still requires deployed acceptance evidence before the POC can
start; see the [POC scope](../../product/poc-scope.md).

Rule-version strings containing `_POC_V1` are already persisted calculation identifiers. Their name
is historical, but must not be renamed without an explicit migration/recalculation policy. The old
`RyczaltCalculationApplicationService` was an unused parallel path and has been removed; native month
calculation is the sole active orchestrator.

Carry-forward is read from a current prior-period VAT and Ryczałt result. A present but
malformed/incomplete snapshot fails explicitly instead of silently becoming zero. The opening-state
contract supplies the first managed VAT month; missing later current results fail. Persisted
`_2026_POC_V1` rule identifiers remain stable. Other tax years are rejected, not labelled with 2026
formulas. Persisted no-revenue confirmation is required before an empty income set can be calculated
and is cleared when later accounting input changes invalidate the period.

The legacy `modules/accounting` source tree and historical `accounting_*` database schema are retained
as migration/reference evidence. They are not part of the active Maven runtime; removing source files
or database history is a separate data-retention and migration decision.
