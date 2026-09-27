# Ryczałt product strategy

## Strategic goal and POC boundary

Ryczałt is an independent accounting product for Polish sole proprietors. It owns its backend, customer experiences, internal review tooling, accounting persistence and integrations.

The product should automate routine accounting while keeping the supported scope narrow enough to remain reliable.

This describes the product direction, not a feature-completeness claim. The
controlled POC supports the bounded profile and prerequisites in
[`poc-scope.md`](poc-scope.md). Required/optional/deferred scope and readiness
gates there take precedence over aspirational examples in this strategy.

## Initial target customer

The first supported profile is:

- Polish JDG
- 12% ryczałt
- active VAT taxpayer
- monthly PIT settlement
- monthly VAT settlement

The initial UX should be optimized for this user rather than generalized around every Polish tax configuration.

## Core principles

### 1. Minimal user input (future self-service direction)

Prefer:

```text
retrieve -> prefill -> confirm
```

over:

```text
ask user to type known public data
```

Company identity should be derived from NIP and official/public sources where
possible when self-service onboarding is implemented. Today, user access is
invitation-based and accounting configuration is provisioned on the backend.

### 2. Progressive configuration (future self-service direction)

Ask for information only when it is required.

Examples:

- company name/address/REGON: retrieve automatically
- KSeF: optional during onboarding
- ZUS payment account: ask when payment setup requires it
- historical opening data: collect and validate it before any dependent
  calculation; missing is not zero
- advanced VAT corrections: do not ask users who do not need them

### 3. Backend authority

The backend owns:

- tax calculations
- VAT calculations
- ZUS calculations
- invoice accounting state
- approval rules
- accounting completeness
- payment obligations
- source/integration state

Mobile and web do not infer missing accounting facts.

### 4. Make incomplete data explicit

The product must distinguish:

- no invoices recorded
- user confirmed no activity
- KSeF disconnected
- KSeF sync failed
- historical data missing
- calculation incomplete
- calculation complete
- backend request failed

Zero is a financial value; it must not be used as a fallback for unknown data.

### 5. Optional automation is not a blocker

KSeF should improve automation but not block account creation or access to Home.

A user without a ready token/certificate can choose **Configure later / Skonfiguruję później** and continue using supported manual workflows.

### 6. Narrow support beats misleading flexibility

Unsupported configurations may be shown as upcoming features, but the backend must reject them.

Current examples:

- 8.5% ryczałt
- multiple ryczałt rates
- quarterly PIT
- quarterly VAT
- VAT exemption
- linear tax
- tax scale
- non-JDG forms

## Product surfaces

### Mobile

Optimized for everyday actions:

- Home / what needs attention
- current obligations and deadlines
- invoices
- quick imports
- payment status
- reminders
- KSeF status
- essential settings

### Customer web

Optimized for detailed management:

- full invoice lists and filters
- detailed calculations
- historical accounting data
- advanced settings
- reports and exports
- document management
- integration history
- payment history/reconciliation
- account and access management

### Backoffice (future product surface)

Optimized for staff:

- accounting review queues
- classification exceptions
- completeness issues
- corrections
- KSeF/integration failures
- support cases
- user/account administration
- audit trails

Administrator access and accounting-review access are separate roles and must
be enforced by the backend. This is not a claim that the full backoffice is
available in the POC.

## Future self-service success criterion

A supported JDG user should be able to go from NIP to a useful Home screen in minutes, without manually re-entering public company data or preparing KSeF credentials first.
