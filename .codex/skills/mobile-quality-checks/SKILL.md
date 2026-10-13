---
name: mobile-quality-checks
description: Validate the Ryczałt IT Expo mobile workspace with TypeScript, ESLint, formatting, Vitest and Expo Doctor. Use before proposing or merging mobile changes.
---

# Ryczałt IT mobile quality checks

1. Record branch, commit and working-tree status. Preserve uncommitted work.
2. From the repository root run `cd apps/mobile && npm ci && npm run ci && npx expo-doctor`.
3. Report each check's outcome and failures; do not silently skip failing steps.
4. If changing auth, network, offline state, or accounting UI, review the existing focused tests and documented contracts.
5. For emulator evidence, follow `ryczalt-it-emulator-audit` rather than inventing a generic APK/device workflow.
6. State that source checks do not establish live API, physical-device or store-release readiness.
