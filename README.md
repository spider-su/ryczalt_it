# Investory Accounting Mobile — prototype

Standalone Expo + React Native + TypeScript prototype for the Investory Accounting mobile app.

## Scope

The app supports the read-only Investory accounting API and an explicit mock mode.

Implemented skeleton:

- Home / monthly Accounting dashboard
- total amount to pay
- Ryczałt / VAT / ZUS breakdown
- income preview
- cost preview
- payment preview
- "needs attention" card
- placeholder Documents, Tasks and More tabs
- repository boundary for replacing mocks with a REST implementation later

No backend, authentication, KSeF, JPK, persistence, real accounting calculations or production security are included.

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

The backend must allow the Expo Web origin (`http://localhost:8081`) through its `/api/v1/**` CORS configuration. The mobile app does not add a browser CORS workaround.

The UI keeps canonical accounting calculations on Investory. `paymentSummary.totalOutstanding` is displayed as the authoritative total-to-pay value; the current backend response does not provide its currency, so it is displayed without an invented currency suffix.

The repository remains replaceable:

```ts
createAccountingRepository();
```

Keep all canonical accounting calculations on the Investory backend. The mobile project should display server results and perform only presentation-level formatting.

## Suggested next increment

1. Add month-selection bottom sheet.
2. Add invoice/document detail screen.
3. Add task/reconciliation detail screen.
4. Add visual regression screenshots.
5. Introduce `RestAccountingRepository`.
6. Add authentication only when the backend integration starts.
