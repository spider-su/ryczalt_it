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
The month service reads this value from the previous period's current VAT calculation.

## ZUS

`ZusRules2026` is intentionally limited to the supported JDG cases. An active JDG without qualifying
UoP pays full JDG social contributions and optionally voluntary sickness; qualifying UoP removes JDG
social contributions in this layer but retains the applicable health band. An inactive JDG pays zero.
Health bands use year-to-date ryczałt revenue after paid social contributions: low through PLN
60,000, medium through PLN 300,000, then high. Explicit contribution overrides support the
persisted year-specific facts used by calculation inputs.

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
| Orchestration | `NativeMonthCalculationServiceTest` | all three calculations, obligation creation, persisted prior-period VAT carry-forward and invalid prior VAT snapshot rejection |
| Aggregation | `NativeMonthInputAggregatorTest` | approved invoice grouping, missing income rate rejection and foreign-currency booked PLN input |
| Reference parity | `HappyInvestorCalculationTest` and backend certification tests | captured normalized reference values; see `src/test/resources/certification/2026/README.md` |

These are unit tests and run without Docker. Database locking, persistence revisions, and transactional
behavior are covered separately by integration tests (`*IT`).

## Persistence compatibility and open debt

Rule-version strings containing `_POC_V1` are already persisted calculation identifiers. Their name
is historical, but must not be renamed without an explicit migration/recalculation policy. The old
`RyczaltCalculationApplicationService` was an unused parallel path and has been removed; native month
calculation is the sole active orchestrator.

Carry-forward is read from a current prior-period VAT result. A present but malformed/incomplete
snapshot now fails explicitly instead of silently becoming zero. If the previous period or current
VAT calculation is absent, the current service still uses zero carry-forward; deciding whether that
means a genuine zero or missing historical input requires an explicit accounting-start/historical
bootstrap contract. Do not change this fallback independently of that contract.

The legacy `modules/accounting` source tree and historical `accounting_*` database schema are retained
as migration/reference evidence. They are not part of the active Maven runtime; removing source files
or database history is a separate data-retention and migration decision.
