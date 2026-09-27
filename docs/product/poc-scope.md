# Controlled POC scope

This document is the source of truth for what the controlled Ryczałt IT POC may
claim and what must be true before real users rely on it. The roadmap tracks
delivery status; this document defines the boundary. Product vision beyond this
boundary is not a promise of current functionality.

## POC audience and supported case

- Polish sole proprietors (JDG) using 12% ryczałt.
- Monthly PIT advances and active, monthly VAT.
- Invoice facts may be denominated in PLN, EUR, or USD; accounting calculations
  use the backend's booked PLN amounts and supported FX behavior.
- Small invoice volume and a controlled cohort of real users.
- Customer web and mobile clients connected to the standalone backend.
- Existing backend-provided accounting/company configuration is authoritative.
  User access is provisioned through invitation and acceptance, not open
  self-registration or a second accounting-configuration wizard.
- Payments may be confirmed manually; integrations are optional and only those
  already implemented and enabled for the environment may be offered.
- Deploy backend and customer web as Docker images; run the backend and web
  service on the configured Cloud Run deployment path. Mobile must target an
  explicitly configured API environment.

Mid-year starts are in scope only when a validated opening accounting state is
available. Missing opening values, prior VAT carry-forward, prior tax/deduction
state, or year-to-date contribution inputs must never be presented as known
zero. Until the backend contract and calculation path fail closed for required
missing inputs, mid-year accounting is a release-blocking gap, not an accepted
workaround.

## Required before POC use

1. Correct monthly PIT, VAT, and ZUS calculations for the supported profile,
   including regression tests for calculation boundaries and rounding.
2. Explicit accounting-start date and validated historical opening state; no
   missing-required-input-as-zero behavior.
3. Correct VAT excess-input carry-forward and year-to-date calculation inputs.
4. Distinct due, paid, partially paid, and manually confirmed payment semantics.
5. Backend validation and rejection of unsupported accounting configuration.
6. Deployed backend and customer web, with mobile connectivity against the
   intended non-production/POC API; release URLs and secrets configured without
   production fallbacks.
7. Realistic end-to-end acceptance covering invite activation, profile access,
   invoice/counterparty flows, monthly calculation, payment status, and errors.
8. Operational health/readiness, image vulnerability scan/SBOM, backup and
   rollback procedure, and a support path for the controlled cohort.

## Optional within the POC

- KSeF or other integrations only where the exact environment capability is
  implemented, configured, and tested. Manual invoice/payment workflows remain
  available where supported; integration failure must be visible, not silently
  interpreted as no activity.
- Import-assisted document entry and notifications where already available.
- Invitation-based additional access only where backend authorization and
  customer experience are verified.

Optional means not required for accounting correctness; it does not mean
unimplemented functionality may be advertised as available.

## Explicitly deferred

- JPK_V7M file generation or submission, and automated tax declaration filing.
- KSeF invoice issuance and FA(3) support.
- PIT-28 annual return generation/submission and full annual health contribution
  settlement.
- Additional ryczałt rates, multiple rates, quarterly settlement, VAT-exempt
  taxpayers, other tax forms, or other legal forms.
- Ulga na start, preferential ZUS, and ZUS+ regimes until separately specified,
  implemented, and validated.
- Bank API/MT940 automation and fully automated reconciliation.
- Full backoffice/reviewer product, multiuser productization, advanced
  self-service onboarding, and replacement of a full accounting office/system.

## POC exit criteria

The POC is ready to start only when every required item above is evidenced in
the deployed candidate. A green unit-test suite alone is insufficient. Record
the tested commit/image digests, environment, test profile, migration result,
end-to-end outcome, and known limitations. Do not describe the product as
production-ready or generally available based on a controlled POC acceptance.
