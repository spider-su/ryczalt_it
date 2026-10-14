# Engineering level: personal / small-business app

Ryczałt IT is a focused JDG accounting application, not an enterprise platform. Adapted from spider-su/mobile_template and Ryczałt rental app.

Prefer simple, maintainable, end-to-end improvements. Reuse existing mobile components, theme, translations, API client, authentication and backend contracts before introducing abstractions. Avoid speculative microservices, event sourcing, duplicate data stores, generalized workflow engines, extra infrastructure, expensive observability or unneeded CI matrices.

This does NOT relax financial correctness, PIT/VAT/ZUS rules, KSeF workflows, authentication, tenant/profile isolation, secure token storage, migrations, auditability, privacy or data recovery. Keep existing backend and integration tests authoritative.

For new dependencies or infrastructure, identify the immediate need, existing simpler alternative and long-term maintenance cost. Require relevant tests, mobile checks and emulator evidence for native behavior; do not claim an APK proves functionality.
