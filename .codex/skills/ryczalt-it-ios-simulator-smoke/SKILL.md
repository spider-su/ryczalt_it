---
name: ryczalt-it-ios-simulator-smoke
description: Build and smoke-test the Ryczałt IT mobile app in an iOS Simulator using synthetic accounting data.
---

# iOS Simulator smoke

1. Require macOS, Xcode, available simulator and recorded branch/commit. Otherwise report BLOCKED.
2. Work in apps/mobile; run npm ci, npm run ci and npx expo-doctor.
3. Select a disposable simulator; never erase a real device, clear production credentials or delete user data.
4. Run npx expo run:ios --device <SIMULATOR_UDID> to build the current checkout. Use synthetic/demo data only.
5. Verify startup, login/error states, Home, Documents, Payments, More, safe areas, keyboard, light/dark modes and offline feedback.
6. Exercise only mock or test accounting flows; never submit real invoices, payments, KSeF documents or production changes.
7. Capture screenshots with xcrun simctl io <UDID> screenshot <path> and report PASS/FAIL/SKIPPED/BLOCKED.
8. Record device/OS/Xcode/commit and limitations. Simulator does not prove physical-device push notifications or release signing.
