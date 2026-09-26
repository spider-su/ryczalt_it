// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Counterparty } from '../model/accounting';

const repository = {
  getCounterparties: vi.fn<() => Promise<Counterparty[]>>(),
  getCounterpartyInvoices: vi.fn(async () => []),
  getCounterpartyRules: vi.fn(async () => [])
};

vi.mock('../api/config', () => ({ createAccountingRepository: () => repository }));
vi.mock('../theme/theme', () => ({
  theme: { colors: new Proxy({}, { get: () => '#334155' }), radius: { large: 24, control: 12, card: 16, sm: 8 }, spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 }, typography: { section: 18, rowTitle: 16, supporting: 13, body: 16, amount: 28 } },
  createThemeStyles: (styles: unknown) => styles,
  useTheme: () => ({ mode: 'light', preference: 'light', ready: true, setPreference: vi.fn() })
}));
vi.mock('../i18n/LocaleContext', () => ({ useLocale: () => ({ locale: 'pl', ready: true, setLocale: vi.fn() }) }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('../components/DocumentDetailsModal', () => ({ DocumentDetailsModal: () => null }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));

import { CounterpartiesScreen } from './CounterpartiesScreen';

const counterparties: Counterparty[] = [
  { id: '1', legalName: 'Acme Consulting Sp. z o.o.', alias: 'Acme', displayName: 'Acme', taxIdentifier: 'PL 525-276-7755', country: 'PL', ruleCount: 2, invoiceCount: 3 },
  { id: '2', legalName: 'Northwind GmbH', alias: null, displayName: 'Northwind GmbH', taxIdentifier: 'DE123456789', country: 'DE', ruleCount: 0, invoiceCount: 1 }
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CounterpartiesScreen interactions', () => {
  it('filters locally by alias and tax identifier, and offers a distinct no-match state', async () => {
    repository.getCounterparties.mockResolvedValue(counterparties);
    render(<CounterpartiesScreen visible onClose={vi.fn()} />);

    expect(await screen.findByText('Acme')).toBeTruthy();
    expect(screen.getByText('Northwind GmbH')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Szukaj nazwy lub NIP'), { target: { value: '5252767755' } });
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.queryByText('Northwind GmbH')).toBeNull();

    fireEvent.change(screen.getByLabelText('Szukaj nazwy lub NIP'), { target: { value: 'no such supplier' } });
    expect(screen.getByText('Nie znaleziono kontrahentów')).toBeTruthy();
    expect(screen.queryByText('Brak kontrahentów.')).toBeNull();
  });

  it('opens details, returns to the same filtered list, and closes the sheet separately', async () => {
    repository.getCounterparties.mockResolvedValue(counterparties);
    const onClose = vi.fn();
    render(<CounterpartiesScreen visible onClose={onClose} />);

    const search = await screen.findByLabelText('Szukaj nazwy lub NIP');
    fireEvent.change(search, { target: { value: 'Acme' } });
    const row = await screen.findByRole('button', { name: /Acme.*NIP 525-276-7755.*3 faktur/ });
    expect(screen.queryByText('Northwind GmbH')).toBeNull();
    fireEvent.click(row);
    await waitFor(() => expect(screen.getByText('Szczegóły kontrahenta')).toBeTruthy());
    expect(screen.getByText('Acme Consulting Sp. z o.o.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Wstecz' }));
    expect(await screen.findByRole('button', { name: /Acme.*NIP 525-276-7755.*3 faktur/ })).toBeTruthy();
    expect((screen.getByLabelText('Szukaj nazwy lub NIP') as HTMLInputElement).value).toBe('Acme');
    expect(screen.queryByText('Northwind GmbH')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows the database-empty state when no counterparties exist', async () => {
    repository.getCounterparties.mockResolvedValue([]);
    render(<CounterpartiesScreen visible onClose={vi.fn()} />);
    expect(await screen.findByText('Brak kontrahentów.')).toBeTruthy();
    expect(screen.queryByText('Nie znaleziono kontrahentów')).toBeNull();
  });
});
