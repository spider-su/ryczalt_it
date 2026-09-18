import { AccountingMonth } from '../../model/accounting';

export const july2026: AccountingMonth = {
  id: '2026-07',
  dueLabel: 'Due 20 Aug',
  totalToPay: { amount: '10843', currency: 'PLN' },
  matchStatus: 'MATCH',
  taxes: {
    ryczalt: { amount: '5791', currency: 'PLN' },
    vat: { amount: '3557', currency: 'PLN' },
    zus: { amount: '1495', currency: 'PLN' }
  },
  summary: { revenue: { amount: '49159', currency: 'PLN' } },
  income: [
    {
      id: 'income-1',
      title: 'Acme Sp. z o.o.',
      subtitle: 'FV 5/2026 · 31 Jul',
      amount: { amount: '16250', currency: 'PLN' },
      state: 'ok'
    },
    {
      id: 'income-2',
      title: 'Nordwind GmbH',
      subtitle: 'EU-SERVICE-2026-07',
      amount: { amount: '32909', currency: 'PLN' },
      state: 'ok'
    }
  ],
  costs: [
    {
      id: 'cost-1',
      title: 'SalSoft',
      subtitle: 'Accounting · 13 Jul',
      amount: { amount: '366.54', currency: 'PLN' },
      state: 'ok'
    },
    {
      id: 'cost-2',
      title: 'BP Europa',
      subtitle: 'Fuel · 2 Jul',
      amount: { amount: '828.33', currency: 'PLN' },
      state: 'ok'
    }
  ],
  payments: [
    {
      id: 'payment-1',
      title: 'Ryczałt + VAT',
      dueDate: '20 Aug',
      amount: { amount: '9348', currency: 'PLN' },
      paidAmount: { amount: '0', currency: 'PLN' },
      outstandingAmount: { amount: '9348', currency: 'PLN' },
      status: 'NOT_PAID'
    },
    {
      id: 'payment-2',
      title: 'ZUS',
      dueDate: '20 Aug',
      amount: { amount: '1495', currency: 'PLN' },
      paidAmount: { amount: '0', currency: 'PLN' },
      outstandingAmount: { amount: '1495', currency: 'PLN' },
      status: 'NOT_PAID'
    }
  ],
  attentionCount: 1,
  issues: []
};
