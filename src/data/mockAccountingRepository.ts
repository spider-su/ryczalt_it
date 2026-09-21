import type { AccountingRepository } from './accountingRepository';
import type { AccountingPeriod, Counterparty, Invoice, PaymentHistoryLine } from '../model/accounting';
import { july2026, july2026Invoices, july2026PaymentHistory } from './mocks/july2026';

export class MockAccountingRepository implements AccountingRepository {
  async getPeriods(): Promise<unknown[]> { return [{ month: july2026.id, status: july2026.status }]; }
  async getMonth(_month: string): Promise<AccountingPeriod> { return july2026; }
  async getInvoicesForRange(_month: string, _months: number): Promise<Invoice[]> { return july2026Invoices; }
  async getPaymentHistory(_month: string, _type?: string): Promise<PaymentHistoryLine[]> { return july2026PaymentHistory; }
  async getCounterparties(): Promise<Counterparty[]> { return []; }
  async performPeriodAction(_month: string, _action: 'SETTLE' | 'FREEZE' | 'REOPEN'): Promise<void> {}
}

export const accountingRepository: AccountingRepository = new MockAccountingRepository();
