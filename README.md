# Investory Accounting Mobile

Expo + React Native + TypeScript client for the Investory Accounting mobile app.

## Scope

The app presents authoritative monthly accounting data from the Investory API and an explicit mock mode.

Implemented skeleton:

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
- genuine multi-month invoice filtering (repository fetches each requested month)
- read-only document, task-resolution and payment detail sheets
- local auto-approval policy settings with an explicit backend-write guardrail
- repository boundary for replacing mocks with a REST implementation later

The mobile client does not calculate tax, obligations or lifecycle state. It does not initiate payments. Settlement history remains unavailable because the current backend does not expose a dedicated history endpoint.

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

The last two commands require an authenticated Expo account and a linked EAS project. Do not commit generated `android/` or `ios/` directories unless the project moves to a bare workflow.

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

  screens/
    HomeScreen.tsx
    DocumentsScreen.tsx
    TasksScreen.tsx
    MoreScreen.tsx

  theme/
    theme.ts

  utils/
    money.ts
```

## Investory API configuration

The UI does not know where Accounting data comes from.

Run Expo Web against the local Investory backend:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080 \
EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE=api \
EXPO_PUBLIC_ACCOUNTING_MONTH=2025-01 \
npx expo start --web
```

`EXPO_PUBLIC_ACCOUNTING_MONTH` selects the `YYYY-MM` month used by Home. The default data source is `api`; use `EXPO_PUBLIC_ACCOUNTING_DATA_SOURCE=mock` for the bundled July 2026 fixture.

The API calls are:

- `GET /api/v1/profiles/1/accounting/months/{month}`
- `GET /api/v1/profiles/1/accounting/months/{month}/documents`

Invoice range filters call the same two endpoints for each required month. There is currently no backend month-index or settlement-history endpoint, so month navigation is bounded by the current calendar month and unavailable older periods are shown as an API error.

The backend must allow the Expo Web origin (`http://localhost:8081`) through its `/api/v1/**` CORS configuration. The mobile app does not add a browser CORS workaround.

The UI keeps canonical accounting calculations on Investory. `paymentSummary.totalOutstanding` is displayed as the authoritative total-to-pay value; the current backend response does not provide its currency, so it is displayed without an invented currency suffix.

The repository remains replaceable:

```ts
createAccountingRepository();
```

Keep all canonical accounting calculations on the Investory backend. The mobile project should display server results and perform only presentation-level formatting.

## Validation

```bash
npm run typecheck
npm test
npm run ci
```

## Suggested next increment

1. Connect auto-approval settings to authenticated backend write actions.
2. Add native authentication.
3. Validate Android/iOS builds and the EAS release flow.
