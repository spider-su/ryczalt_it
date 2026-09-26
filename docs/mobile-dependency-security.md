# Mobile dependency security review

Review date: 2026-09-26.

`npm audit --omit=dev --audit-level=moderate` reports 12 moderate advisories
after the safe, non-forced audit fix and Sentry installation. The count is
mostly repeated package paths for one vulnerable transitive `uuid` package in
Expo's configuration/build graph; Sentry's Expo integration traverses the same
graph.

## Classification

- `uuid` through `xcode` and Expo config plugins: transitive build/config
  tooling. It is not an application runtime import. Deferred; `npm audit
  --force` proposes a breaking Expo SDK downgrade and is not acceptable.
- Expo CLI/config/plugin packages: transitive tooling paths reported through
  the direct `expo` package. No Expo SDK-compatible targeted remediation was
  available without a broad upgrade.

## Decision

- Runtime-relevant advisories demonstrated: none. The `uuid` path is used by
  `xcode` during native configuration/build processing, not by the bundled
  application code.
- Fixed: `decode-uri-component`/`query-string` was removed by the regular
  `npm audit fix`, which upgraded React Navigation core to 7.22.1.
- Deferred: 12 moderate transitive Expo config/build advisories reported by
  npm's package-path accounting.
- No `npm audit fix --force` was run.
- Expo SDK and React Native were not changed. The EAS configuration remains
  compatible with Expo SDK 57.

The remaining advisories are a dependency-upgrade follow-up item. They do not
block the automated mobile gate, but a future Expo SDK upgrade should re-run
`npm audit --omit=dev`, `npx expo-doctor`, and the mobile test suite together.
