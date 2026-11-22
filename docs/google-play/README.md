# Ryczałt IT — Google Play release kit

App: **Ryczałt IT**, package **pl.investory.accounting** (intentionally retained), category Finance, free, default language Polish.

## What actually works
NIP checksum and official VAT register lookup, on-device company profile, KSeF token secure storage, authentication check. Invoice sync and tax calculations **are not yet available**. The app is independent of the proprietary backend in free mode, but needs internet to reach government APIs.

## Store submission
1. Review the privacy policy and publish `docs/google-play/privacy-policy.html` at a permanent public HTTPS URL (e.g. GitHub Pages); test HTTP 200 and accessibility without login.
2. Add that URL to Play Console and add an in-app privacy policy link before release.
3. Generate/upload actual screenshots from a production-mode installed APK: at least two phone screenshots. Do not represent tax estimates or invoice sync as functional.
4. Review and upload a 512x512 Play icon and 1024x500 feature graphic. Editable SVG source templates are in `assets/`; export PNG before upload.
5. Confirm Play Console package is not already registered to another app. Package ID cannot change after first upload.
6. Create a private Play upload keystore. Configure repository Actions secrets: `PLAY_UPLOAD_KEYSTORE_BASE64`, `PLAY_UPLOAD_STORE_PASSWORD`, `PLAY_UPLOAD_KEY_ALIAS`, `PLAY_UPLOAD_KEY_PASSWORD`. Never commit keys. Store an offline backup.
7. Manually run **Google Play Android AAB** workflow. Download `ryczalt-it-play-aab`. This workflow does **not** publish or submit automatically.
8. Upload AAB to Internal testing in Play Console and opt in test devices. Verify install, NIP, secure token storage and real KSeF auth. Update versionCode for every subsequent upload.
9. Complete app content declarations: Data Safety based on final SDK audit, Ads, App Access, Target Audience, Content Rating, Government Apps, Financial Features as applicable. Do not claim government affiliation.
10. For personal developer accounts subject to the closed-testing requirement, complete 12 opted-in testers for 14 consecutive days before requesting production access.

## Important
- The generated AAB is signed with the **upload key** you provide, not the Google Play app-signing key.
- The workflow intentionally fails if signing secrets are missing; it never creates a new signing key.
- The existing EAS submit workflow is not used; manual console upload is the safest first release.
- Verify the native Expo KSeF crypto module on a physical Android device before a public release.
- Verify final manifest/SDK data flows before finalizing privacy policy or Data Safety declarations.
