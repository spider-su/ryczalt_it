# Investory Accounting Mobile

Expo + React Native + TypeScript client for the Investory Accounting mobile app.

## Scope

The app presents authoritative monthly accounting data from the Investory API and an explicit mock mode.

Implemented mobile surface:

- Home / monthly Accounting dashboard
- total amount to pay
- Ryczałt / VAT / ZUS breakdown
- income preview
- cost preview
- payment preview
- "needs attention" card
- Documents filtered by income/cost/review status
- shared month selection across Home, Faktury and Rozliczenia
- backend-driven month status and actionable issue summaries
- authoritative PPE, VAT, ZUS and total outstanding values
- settlement detail sheets with paid, unpaid and overdue states
- genuine multi-month invoice filtering (repository fetches documents only for each requested month)
- Add Cost document recognition and backend-confirmed staging submission using backend-provided treatment options
- typed mutation/duplicate/error mapping and refresh invalidation after confirmed mutations
- local auto-approval policy settings with an explicit backend-write guardrail
- Polish and English UI with persisted language selection under More → Settings
- replaceable repository boundary with REST and explicit mock modes

The mobile client does not calculate tax, obligations or lifecycle state. It does not initiate payments. Settlement history is read from the backend payment-history endpoint in API mode. Add Cost renders backend-provided VAT-treatment options, sends selected facts to the backend staging workflow, and leaves tax-period selection to the backend. The mobile client does not infer a VAT rate or use a client-side tax-period fallback.

## Design direction

The UI is inspired by the interaction principles visible in mObywatel:

- large, clear page headings
- card-based information hierarchy
- restrained blue accent
- generous spacing
- strong touch targets
- simple bottom navigation
- important status information surfaced before details

It does **not** copy mObywatel branding, logos or proprietary assets.

## Run

Use Node.js 22.13+ for Expo SDK 57.

```bash
npm install
npx expo install --fix
npm start
```

Then open the app using Expo Go or an Android/iOS development build.

## Release validation

The managed Expo project has Android and iOS prebuild support and three EAS profiles:

```bash
npx expo-doctor
npx expo prebuild --no-install --platform android
npx expo prebuild --no-install --platform ios
npx eas-cli build --profile production --platform all
npx eas-cli submit --profile production --platform all
```

The repository contains the Expo owner (`spider-su`), project slug (`investory-accounting`) and EAS project ID. `EXPO_TOKEN`, Expo account authentication and signing credentials remain external CI/account configuration. Do not commit generated `android/` or `ios/` directories unless the project moves to a bare workflow. A successful cloud EAS build is independent of launching a local Android emulator; missing local SDK executables are local environment issues.

## Structure

```text
src/
  components/
    AccountingListCard.tsx
    PaymentCard.tsx
    SectionHeader.tsx
    SummaryCard.tsx

  data/
    accountingRepository.ts
    mockAccountingRepository.ts
    mocks/
      july2026.ts

  model/
    accounting.ts

  navigation/
    AppNavigator.tsx

  actions/
    cost/
      AddCostScreen.tsx
  screens/
    HomeScreen.tsx
    DocumentsScreen.tsx
    MoreScreen.tsx

  theme/
    theme.ts

  utils/
    money.ts
```

## Investory API configuration

The UI does not know where Accounting data comes from.

By default, the app uses the deployed Investory backend:

```bash
EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE=api \
EXPO_PUBLIC_ACCOUNTING_MONTH=2025-01 \
npx expo start --web
```

To run Expo Web against the local Investory backend instead:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080 \
EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE=api \
EXPO_PUBLIC_ACCOUNTING_MONTH=2025-01 \
npx expo start --web
```

`EXPO_PUBLIC_API_URL` overrides the deployed default. Expo reads `EXPO_PUBLIC_*`
variables when the development server starts, so restart Expo after changing one.

`EXPO_PUBLIC_ACCOUNTING_MONTH` selects the `YYYY-MM` month used by Home. The default data source is `api`; use `EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE=mock` for the bundled July 2026 fixture.

The API calls are:

- `GET /api/v1/profiles/1/accounting/months/{month}`
- `GET /api/v1/profiles/1/accounting/months/{month}/documents`
- `GET /api/v1/profiles/1/accounting/payments/history?from={month}&to={month}&type={type}`
- `GET /api/profiles/1/accounting/counterparties`

Invoice range filters request only documents for each explicitly selected month. `Wszystkie` in the date filter means all documents in the selected month; there is no unbounded global invoice-history endpoint or pagination contract.

Add Cost uses:

- `POST /api/profiles/1/accounting/documents/recognize`
- `POST /api/profiles/1/accounting/documents`

The save response is authoritative and may report a deterministic duplicate document. Recognition returns backend-supported VAT-treatment options and conditional `requiredInputs` metadata for fields such as VAT rate and counterparty country; mobile renders those requirements without encoding tax rules. Tax-period selection remains backend-owned. If recognition does not provide the metadata needed for a document requiring an accounting decision, mobile stops and directs the user to the web panel.

The backend must allow the Expo Web origin (`http://localhost:8081`) through its `/api/v1/**` CORS configuration. The mobile app does not add a browser CORS workaround.

### Text ownership and localization boundary

Known product state follows `backend code → mobile semantic presentation state → UI translation`. Backend human-readable fields remain optional detail and are not machine-translated. Current issue titles/messages, lifecycle/next-action labels, document source/category labels, resolution labels/reasons/options, and recognition input/option labels are backend display copy; their stable codes are retained where available. A future English UI must either localize states from those codes or keep backend copy explicitly marked as server-provided until the backend exposes a complete semantic contract.

The UI keeps canonical accounting calculations on Investory. `paymentSummary.totalOutstanding` and PPE/VAT/ZUS values are displayed as authoritative backend values. The Polish accounting-obligation contract has no currency field and is PLN-scoped, so PLN is attached once in the accounting mapper rather than reconstructed in screens. Document currencies remain backend-provided. Accounting API monetary responses use decimal strings; the mobile mapper accepts legacy numeric fixtures only during rollout and stores domain money as strings. Mobile formats amounts but does not perform accounting arithmetic.

The UI supports exactly `pl` and `en`. English uses `en-GB` formatting for a European financial presentation; tax jurisdiction remains Poland. Saved locale preference takes precedence over supported device English, with Polish as fallback. Locale changes affect presentation strings and formatting only: accounting month IDs, backend enums, tax periods, amounts, currencies, profile and mutation payload semantics remain unchanged. Backend human-readable display fields are not machine-translated; stable backend codes are required for complete future localization.

Authentication uses the current token at request time. A confirmed HTTP 401 invalidates the central session and returns the app to sign-in. The accounting profile is currently fixed to `ACCOUNTING_PROFILE_ID = 1`; authenticated profile selection is not yet available and remains a pre-production blocker.

The repository remains replaceable:

```ts
createAccountingRepository();
```

Keep all canonical accounting calculations on the Investory backend. The mobile project should display server results and perform only presentation-level formatting.

## Validation

```bash
npm ci
npm run typecheck
npm test
npm run ci
npx expo-doctor
```

The authoritative validation workflow is `.github/workflows/mobile.yml`. It runs Expo Doctor plus typechecking and tests for pull requests and pushes to `develop`/`main`. Preview, production and manually triggered release workflows remain build/release workflows.

EAS workflows use the same repository-level `EXPO_TOKEN` secret: `mobile-preview.yml` builds an Android preview on pushes to `develop`, `mobile-production.yml` builds Android production on pushes to `main`, and `mobile-release.yml` supports manual preview/production builds. Each workflow fails before dependency installation if the secret is missing. The token is never stored in the repository or printed in logs. Configure the Expo project/account and repository secret outside Git.

## Suggested next increment

1. Connect auto-approval settings to authenticated backend write actions.
2. Validate Android/iOS builds and the EAS release flow.
