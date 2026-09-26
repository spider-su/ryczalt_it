# Automated onboarding

## Goal

Onboarding should collect only the information required to create a valid supported accounting profile.

Target flow:

```text
1. Enter NIP
2. Retrieve and confirm company
3. Confirm supported accounting setup
4. Answer required ZUS questions
5. Connect KSeF now or later
6. Open Home
```

## Step 1 — Company by NIP

The user enters NIP once.

Backend lookup should use supported authoritative/public sources where available, such as:

- GUS / REGON
- CEIDG
- VAT White List
- VIES where relevant

The application should retrieve, when available:

- legal company name
- REGON
- business status
- business start date
- registered address
- owner name
- VAT registration status
- registered business bank accounts

The user confirms the result instead of typing it again.

Retrieved values should keep provenance and retrieval time. User corrections must not be silently overwritten by later refreshes.

## Step 2 — Supported accounting setup

Current supported profile:

- JDG
- ryczałt 12%
- PIT monthly
- active VAT
- VAT monthly

The UI should present this as one concise configuration summary and ask the user to confirm it.

Do not make the user select four radio buttons when only one combination is supported.

Other configurations may be visible under **Wkrótce / Coming soon**, but disabled.

The backend validates the configuration and rejects unsupported combinations.

## Accounting start date

Ask:

> From when do you want to keep accounting in Ryczałt?

Default to the current accounting month.

If the user starts mid-year, do not assume prior revenue, paid tax, VAT carry-forward or contribution values are zero. Missing historical inputs must produce an incomplete-calculation state and be handled by the later historical-bootstrap workflow.

## ZUS

Use progressive questions based on the current calculation engine.

Ask only for facts required for supported calculations, for example:

- contribution regime
- concurrent employment
- voluntary sickness insurance
- health-contribution inputs where required

Do not infer ZUS entitlement solely from business age.

Year-dependent thresholds belong to backend rules, not onboarding UI constants.

## Step 3 — KSeF

KSeF is optional.

Offer two clear actions:

- **Connect now / Połącz teraz**
- **Configure later / Skonfiguruję później**

Skipping KSeF:

- completes onboarding
- does not produce an error
- does not block Home
- keeps manual supported invoice workflows available
- leaves KSeF status as not connected
- allows connection later in Settings

A failed KSeF connection must not roll back company or accounting setup.

## First Home after onboarding

Do not start another wizard.

Show a compact contextual readiness section only when useful.

Examples:

- company configured — complete
- tax setup — complete
- current-period data — review if needed
- KSeF — optional

The backend owns readiness/completeness status. Mobile must not infer “no revenue” from an empty invoice list.

## Existing users

Do not force established users through new onboarding if their current profile already contains the required configuration.

Request only genuinely missing information.
