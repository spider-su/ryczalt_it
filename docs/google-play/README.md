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
6. Configure the **permanent Google Play upload key** once, following the local setup below. The AAB workflow must never generate a new key on a runner.

7. Manually run **Google Play Android AAB** workflow. Download `ryczalt-it-play-aab`. This workflow does **not** publish or submit automatically.
8. Upload AAB to Internal testing in Play Console and opt in test devices. Verify install, NIP, secure token storage and real KSeF auth. Update versionCode for every subsequent upload.
9. Complete app content declarations: Data Safety based on final SDK audit, Ads, App Access, Target Audience, Content Rating, Government Apps, Financial Features as applicable. Do not claim government affiliation.
10. For personal developer accounts subject to the closed-testing requirement, complete 12 opted-in testers for 14 consecutive days before requesting production access.

## Fix for missing PLAY_UPLOAD_KEYSTORE_BASE64

When the `Google Play Android AAB` workflow fails at `Configure Play upload signing` with `Missing signing secret PLAY_UPLOAD_KEYSTORE_BASE64`, the repository has not been configured with the upload key. This cannot be solved by rerunning CI or changing application code. The secrets must be set once by a repository administrator.

1. **Check whether this package has already been uploaded to Google Play.** If `pl.investory.accounting` has a registered upload certificate, use the **same existing keystore**. Do not create a replacement key without using Google Play's upload-key reset process.
2. If this is its **first ever Google Play upload**, create a new *private* keystore **on your own trusted computer** (not in GitHub Actions). For example, in Git Bash, macOS Terminal, or Linux:

   ```sh
   # Choose a private directory OUTSIDE the repository and back up its contents securely.
   mkdir -p "$HOME/secure-play-keys"
   keytool -genkeypair -v -keystore "$HOME/secure-play-keys/ryczalt-it-upload.jks" \
     -alias ryczalt-upload -keyalg RSA -keysize 4096 -validity 10000 \
     -storetype PKCS12 -dname "CN=Ryczalt IT Upload, O=Independent Developer, C=PL"
   ```

   Provide a strong keystore password. For PKCS12, keep the key password equal to the store password.

3. Install the official GitHub CLI, sign in with `gh auth login`, and from this repository checkout execute:

   ```sh
   bash scripts/setup-play-upload-secrets.sh \
     "$HOME/secure-play-keys/ryczalt-it-upload.jks" ryczalt-upload
   ```

   The helper checks the keystore and alias locally, asks for both passwords without echoing them, then sets all four repository Actions secrets through `gh secret set` using stdin. It does not upload the keystore to the Git repository.

4. Keep an **offline backup** of the keystore, its alias and both passwords. Treat the key as a sensitive credential. Verify the secret **names** (not values) under **GitHub → Settings → Secrets and variables → Actions → Repository secrets**.
5. From **Actions → Google Play Android AAB → Run workflow** on `main`, build again and download the `ryczalt-it-play-aab` artifact. Upload the resulting signed AAB to your Play Console internal testing track.

If the failure persists after all four secrets exist, read the new job log. Do **not** replace the keystore just to obtain a green job.

## Important
- The generated AAB is signed with the **upload key** you provide, not the Google Play app-signing key.
- The workflow intentionally fails if signing secrets are missing; it never creates a new signing key.
- The existing EAS submit workflow is not used; manual console upload is the safest first release.
- Verify the native Expo KSeF crypto module on a physical Android device before a public release.
- Verify final manifest/SDK data flows before finalizing privacy policy or Data Safety declarations.
