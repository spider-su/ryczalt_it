# Mobile dependency security review

Review date: 2026-09-19.

`npm audit` reports 13 moderate advisories. `npm audit --omit=dev` reports
the same 13 because Expo's package graph is installed as an application
dependency.

## Classification

- `decode-uri-component` through `query-string` and React Navigation: a
  transitive advisory. No direct application import or affected malformed-URI
  path was demonstrated. Deferred; no compatible narrow upgrade was selected.
- `uuid` through `xcode` and Expo config plugins: transitive build/config
  tooling. It is not an application runtime import. Deferred; `npm audit
  --force` proposes a breaking Expo downgrade and is not acceptable.
- Expo CLI/config/plugin packages: transitive tooling paths reported through
  the direct `expo` package. No Expo SDK-compatible targeted remediation was
  available without a broad upgrade.

## Decision

- Runtime-relevant advisories demonstrated: none.
- Fixed: none; no safe non-breaking targeted upgrade was identified.
- Deferred: all 13 moderate transitive/tooling advisories.
- No `npm audit fix --force` was run.
- Expo SDK, React Native, and EAS configuration were not changed.

The advisories remain a dependency-upgrade follow-up item. They do not block
the automated mobile gate, but a future Expo SDK upgrade should re-run the
audit and `npx expo-doctor` together.
