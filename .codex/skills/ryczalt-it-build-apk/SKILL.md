---
name: ryczalt-it-build-apk
description: Build a standalone Android release APK for the Investory Accounting mobile app from the current ryczalt_it checkout. Use when asked to build, refresh, or deliver a local QA APK; this does not upload or install it.
---

# Build Investory Accounting APK

Run from the repository root, or pass the repository root as the script's first argument:

```sh
./.codex/skills/ryczalt-it-build-apk/scripts/build_apk.sh [repo-root]
```

The helper validates this checkout's mobile app identity and API build configuration, repairs the known missing Expo clipboard dependency when needed, generates Android native files from Expo config, builds `assembleRelease`, verifies the standalone JS bundle, package ID, and APK signature, then replaces `apps/mobile/scripts/tmp/investory-accounting.apk` only after validation succeeds. It does not upload or install the APK.

Project invariants:

- Expo project owner `smart-box`, EAS project ID `8fa28fb6-df62-4889-8e3a-8094de92bd59`, Android package/application ID `pl.investory.accounting`, and iOS bundle ID `pl.investory.accounting`. The script refuses a different configured identity; do not borrow the separate `/Users/alex/projects/ryczalt` app identity or EAS project.
- API mode is the app default. Set `EXPO_PUBLIC_API_URL` to the intended HTTPS backend API origin in the build environment. The script rejects an unset URL and does not substitute the customer web host, localhost, or a remembered production URL. It prints only that the value is configured, not the URL itself.
- Keep `EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE=api` or unset. The helper refuses mock mode so a QA APK cannot silently contain fabricated accounting data.
- The native module `expo-clipboard` must be a direct mobile dependency for Expo's React Native compatibility layer. If it is absent, the helper runs `npx expo install expo-clipboard` to select the version matching this Expo SDK, updates the mobile manifest/lockfile, then continues. Do not patch generated Android files as a substitute.
- If another build error appears, inspect the actual diagnostic and fix a small, unambiguous compile or missing-file/dependency issue in source, then rerun the relevant check and continue. Preserve unrelated work and report the source change. Do not suppress compiler errors or remove functionality to get a green build.
- Use JDK 17. Prefer the active JDK only if its actual version is 17; otherwise resolve a local JDK 17 with `/usr/libexec/java_home -v 17` or SDKMAN. Do not build with JDK 25.
- Use `ANDROID_SDK_ROOT`, `ANDROID_HOME`, or the local Android SDK configured on this machine. The script exports both SDK variables for Gradle.
- The release APK is locally signed for sideload/QA. It is not Play Store signed. Never create, overwrite, or reuse a production keystore for this task.
- Sentry source-map auto-upload is disabled for the local build. Do not print or change Sentry project configuration.
- The APK output lives below ignored `apps/mobile/scripts/tmp/`; do not add it to Git unless separately requested.

After running, report the build result, output path, size, SHA-256, package ID, signer verification, and API configuration state. A successful build is not an emulator, authentication, API, or accounting verification.

Stop for user input when the failure requires a choice about accounting behavior, API/auth contracts, backend URL or credentials, app/EAS identity, versioning/signing, or external service configuration. Do not guess those values.
