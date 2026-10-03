# Account activation and future onboarding

## Current account activation

Accounting/company configuration is provisioned on the backend. The current
account lifecycle is access activation, not a second accounting setup wizard:

```text
administrator provisions/invites user and profile access
 -> user accepts invitation and establishes credentials
 -> user signs in
 -> backend returns authorized profile context
 -> mobile or customer web presents backend-owned accounting state
```

The backend owns the profile and authorization boundary. A client must not let
the user supply an arbitrary profile ID as proof of access, create conflicting
accounting configuration, or infer readiness from a successful login, empty
list, or zero-valued response. Invitations are the current supported way to
activate a new user; public self-registration is not available.

When a user has no accessible configured profile, show a clear access/setup
state and route them to the administrator/support process. Do not start an
accounting wizard that duplicates backend-provided configuration.

## POC account acceptance

Before inviting a controlled POC user, verify that the backend profile is
complete and within the supported scope: Polish JDG, 12% ryczałt, monthly PIT,
active VAT and monthly VAT. Verify access is bound to that profile and that
unsupported configurations are rejected. See [controlled POC scope](poc-scope.md).

For mid-year use, verify an explicit accounting start date and the opening
facts required for calculations. Missing prior VAT carry-forward, year-to-date
revenue, consumed deductions, or contribution facts cannot be represented as
zero. The backend requires a complete opening-state record and fails closed when
required monthly contribution or historical calculation facts are absent. Do
not use a profile until its opening state and first supported month have been
validated against regression tests and deployed acceptance evidence.

KSeF and other integrations are optional only where implemented and enabled.
Skipping an optional integration must not falsely certify complete accounting
data or block supported manual workflows.

## Future self-service onboarding (not implemented)

If public self-service account creation is later approved, design it as a
separate project. Candidate flow:

```text
identity verification
 -> backend creates/assigns an authorized profile
 -> retrieve and confirm public company data
 -> validate supported accounting configuration
 -> collect required ZUS and opening-state facts
 -> offer optional implemented integrations
 -> backend reports readiness and next actions
```

NIP lookup, GUS/CEIDG/VAT registry prefill, self-service profile creation, and a
NIP-to-Home promise are product direction only, not current functionality.
Never expose a selectable tax/ZUS mode until backend validation and supported
calculations exist.
