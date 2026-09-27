# Ryczałt backoffice

Planned staff application for administrators and accounting reviewers.

## Product role

Backoffice is not a customer settings portal. It is a privileged operational/review surface.

Planned responsibilities:

- accounting review queues
- invoice classification exceptions
- completeness issues
- corrections
- KSeF/integration failures
- support investigation
- user/profile administration
- reviewer assignments
- audit trails

## Roles

Administrator and accounting reviewer are distinct roles.

Access to customer accounting data must be explicitly authorized and enforced by the backend. Hiding UI controls is not sufficient authorization.

## Current state

No fake/stub operational UI is introduced during extraction. Implementation starts after the standalone backend contract, role model and deployment baseline are stable.

See [strategy](../../docs/product/strategy.md) and [roadmap](../../docs/product/roadmap.md).
