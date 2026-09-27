# Canonical accounting period contract

The mobile client consumes independent canonical concepts from:

- period summary and status;
- settlement totals and obligations;
- reconciliation;
- completeness and issues;
- invoices and transactions;
- allowed period actions.

Mobile does not recreate a giant accounting response model, calculate
settlement totals, infer lifecycle from unpaid obligations, or execute issue
commands. Transport DTOs are mapped into `AccountingPeriod`, `Invoice`,
`Obligation`, `Transaction`, and `AccountingIssue` domain models.
