# Agent architecture and component reuse guide

Read AGENTS.md, docs/product/poc-scope.md and relevant domain/API contracts before changing code. Source and tests are authoritative.

| Concern | Reuse location | Constraint |
|---|---|---|
| Mobile screens | apps/mobile/src/screens/ | Preserve Polish accounting workflows and navigation |
| Shared UI | apps/mobile/src/components/ui.tsx | Prefer extending existing controls over copying generic template components |
| Other shared components | apps/mobile/src/components/ | Reuse StatusBanner, PaymentFeedback, cards and details modals where appropriate |
| Appearance | apps/mobile/src/theme/theme.tsx | Keep light/dark/system behavior; do not overwrite palette |
| Translations | apps/mobile/src/i18n/ | Keep existing locale support |
| API/auth | apps/mobile/src/api/, apps/mobile/src/auth/ | Never replace secure sessions with generic template storage |
| Accounting backend | apps/backend/ | Keep API contracts and financial calculations authoritative |
| Android tests | .codex/skills/ryczalt-it-emulator-audit/ | Run focused accounting regressions with synthetic data |
| iOS tests | .codex/skills/ryczalt-it-ios-simulator-smoke/ | Only on macOS/Xcode; simulator is not physical device |

Workflow: inspect existing implementation, reuse components, implement focused change, run cd apps/mobile && npm ci && npm run ci && npx expo-doctor, inspect CI, then perform relevant native smoke checks. Preserve backend and mobile separation. Record any skipped checks. Never merge automatically.

Template adoption: use coding guidance, accessibility patterns, local debug APK workflow and optional device-test skills. Do not wholesale copy template navigation, UI primitives, storage, notification adapters or generic validation into accounting logic.
