# Android emulator audit — startup and API integration

**Run date:** 2026-09-27 (Europe/Warsaw)  
**Repository HEAD:** `4b439a1c341272f57b947b01023852475cc3e7f4` (`develop`); pre-existing working-tree changes preserved  
**Device:** Google `sdk_gphone64_arm64`, Android API 35, 320 × 640  
**Variant:** Android release, isolated package `pl.investory.accounting.audit`

## Result

The original `ExpoClipboard` error is a real native dependency mismatch in the accounting app. The current JavaScript bundle requires React Native's deprecated core `Clipboard` compatibility path, which resolves to Expo's `ExpoClipboard` native module. `expo-clipboard` was missing from `apps/mobile` dependencies, so Expo autolinking omitted the module. The focused dependency fix is in [PR 23](https://github.com/spider-su/ryczalt_it/pull/23).

With `expo-clipboard` 57.0.2 added, Expo Android autolinking included the module. Both `assembleDebug` and `assembleRelease` succeeded. An isolated release APK launched to the Investory Accounting sign-in screen; the generated screenshot was inspected locally and is not retained in Git. The original missing-module error did not occur. A debug-only `TypeError: property is not configurable` appeared inside React Native's `deepFreezeAndThrowInDev.js` while rendering `AuthScreen`, but was not present in the release APK. No production behavior change is indicated by that debug-only evidence.

The authenticated accounting review could not proceed because no mobile backend API origin is configured. `EXPO_PUBLIC_API_URL` is unset locally and absent from the EAS `preview` and `production` environment listings. The supplied Cloud Run URL serves the customer web sign-in page; a read-only GET to `/api/v1/auth/me` redirects to `/login`, so it cannot be assumed to be the mobile API origin. See [API configuration evidence](evidence/api-configuration.md).

## Findings

| ID | Severity | Status | Finding |
|---|---|---|---|
| STARTUP-001 | P1 | Fixed in PR 23; release startup verified | `expo-clipboard` was missing, while the current React Native compatibility layer requested `ExpoClipboard`. The dependency fix was autolinked, compiled, and verified in a release APK. |
| API-001 | P1 | Blocked on environment configuration | No verified API origin is available for `EXPO_PUBLIC_API_URL`; no backend authentication or accounting request was made. |

## Accounting and UX coverage

The sign-in screen rendered, but no login was attempted and no credentials were submitted. No accounting screens, values, obligations, invoice states, or accounting statuses were reviewed. Financial correctness, screen consistency, navigation beyond startup, and accounting layout are unverified. No accounting data was read or changed.

## Build evidence

- Android prebuild completed with `expo-clipboard` autolinked at 57.0.2.
- `./gradlew assembleDebug` and `SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew assembleRelease` succeeded using Java 17.
- The release APK was installed in a separate audit-only package because the existing app's signing certificate did not match. Existing app data was preserved.
- Initial `ExpoClipboard` evidence was collected while the emulator was pointed at another checkout's Metro server. After correcting the server host, the same error reproduced from this repository's bundle; the earlier finding is therefore confirmed, not a POC-server artifact.
- A subsequent release build with the dependency fix showed the sign-in screen and no native-module startup error.
