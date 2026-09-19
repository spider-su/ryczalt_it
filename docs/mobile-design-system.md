# Mobile design system

Investory uses a calm, mObywatel-inspired visual language without copying
proprietary assets or layouts. Content and typography establish hierarchy;
surfaces and color are supporting signals.

## Foundations

- `theme.colors.canvas` is the page background. White surfaces are reserved
  for meaningful groups and sheets.
- Blue communicates interaction and selection. Green is reserved for a
  confirmed state, amber for attention, red for failure, and gray for neutral
  or unavailable information.
- Typography uses a small semantic scale: page title, section title, primary
  value, row title, body/supporting text, button, and status.
- Spacing follows the shared 4/8/12/16/24/32/40 rhythm.
- Controls and rows provide at least a roughly 44px touch target and use
  `minHeight` where text may wrap.

## Product primitives

- `PageHeader` and `Section` establish page hierarchy.
- `ListGroup`, `ListRow`, and `KeyValueRow` present related data with spacing
  and hairline dividers rather than nested cards.
- `SegmentedControl` is for short, fixed alternatives with selected/radio
  semantics. Longer or dynamic options should use a vertical selection list.
- `SearchField` provides the shared document search/filter affordance.
- `SheetHeader`, `FormField`, `SettingsRow`, `SettingsGroup`, and
  `PrimaryButton` keep settings and detail sheets consistent.
- `EmptyState`, `ErrorState`, and `LoadingState` distinguish empty data,
  failed requests, and loading.

## Card and status rules

When not to use a card:

- Do not wrap every section or row in a rounded white container.
- Prefer a `Section` plus `ListGroup` when spacing and dividers explain the
  relationship.
- Keep a card only when it contains a distinct attention group, interaction,
  or semantic surface that benefits from containment.

When not to use a status color:

- Do not color routine metadata or unknown values as success or failure.
- Never use color as the only status signal; always provide text.
- Healthy reconciliation means only that the reconciliation data agrees; it
  is not an overall filing or accounting verdict.

## Sheets and inactive rows

Sheets share the same header, close target, padding, radius, form rhythm, and
primary action. A More row without an implemented action is a non-interactive
`ListRow`: no chevron, no pressable semantics, and no implied destination.

## Accessibility and localization

Interactive controls expose role and selected/disabled/busy state. Polish and
English copy must fit the same layouts, including longer filter labels. Rows
must wrap rather than clip at larger text sizes. Status meaning must remain
understandable to screen readers without relying on color.
