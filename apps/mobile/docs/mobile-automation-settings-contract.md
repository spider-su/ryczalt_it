# Counterparty rule migration

The former global auto-approval settings screen and `/accounting/auto-approval`
transport are removed from the mobile target architecture.

Automation is now modelled as a counterparty/service rule:

```text
counterparty → rule/service → classification + autoApprove + paymentVerificationPolicy
```

The mobile client contains canonical counterparty models, repository/API route
foundations, and a list/detail UI foundation. Rule editing remains backend
contract-dependent and must use the canonical `/counterparties/{id}/rules`
endpoints when the Stage 2 contract is available. No legacy accounting route
is used as a fallback.
