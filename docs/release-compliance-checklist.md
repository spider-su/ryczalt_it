# Public release compliance and readiness checklist (2026-11-01)

Status: **audit checklist, not certification or legal advice**. Confirm against implementation before publication.

## Mandatory release gates
- [ ] Identify publisher legal name, public support contact, and privacy contact.
- [ ] Approve a public, non-editable HTML Privacy Policy URL linked from the app and store.
- [ ] Document actual data categories, SDKs, subprocessors, international transfers, retention, deletion and security; align with Google Play Data Safety answers.
- [ ] Confirm whether user accounts can be created; if so provide in-app and public-web account deletion request paths, verify deletion of associated data and disclose lawful retention exceptions.
- [ ] Review GDPR legal bases, user rights, data processor agreements and analytics/advertising consent where applicable.
- [ ] Approve user-facing Terms of Service / EULA with scope, acceptable use, liability, governing law and contact; do not publish placeholders as binding terms.
- [ ] Audit licenses of source, libraries, fonts, imagery, map data, audio and generated assets; preserve required attribution and notices.
- [ ] Confirm source-code licensing decision: no LICENSE file means no general public permission to reuse code; do not add an open-source license without owner's approval.
- [ ] Prepare store metadata, content/age rating, target audience, screenshots, support and privacy URLs.
- [ ] Verify signed release AAB, installation/update path, Play requirements, CI, physical-device acceptance and crash reporting.
- [ ] Complete security and abuse review, verify production secrets and backup/restore or offline data persistence as applicable.
- [ ] Record release owner sign-off and dated evidence for every gate.

## Product-specific gates
- **Ryczałt IT:** test tax calculations, mid-year opening balances, VAT/PIT/ZUS, access isolation, financial data deletion/export, supported JDG profile and legal review of tax disclaimers.
- **World Maps:** audit Firebase friends/QR data flows, parental/children audience classification, map dataset attribution, account deletion if accounts are created, offline functionality and physical Android tests.
- **Rescue Team:** confirm original asset/audio rights, stable Android signing key, store AAB, device installation and upgrade, 20 missions plus trials, progress retention, touch/scroll, and child audience classification.

## Recommended documents to publish after factual verification
1. Privacy Policy (public HTML).
2. Terms of Service / EULA (public HTML).
3. Support and data deletion request page.
4. Third-party notices and asset attributions.
5. Store Data Safety inventory (internal source of truth).

Official policy: https://support.google.com/googleplay/android-developer/answer/18265346
