import { AccountingRepository } from './accountingRepository';
import { AccountingLine, AccountingMonth, PaymentHistoryLine } from '../model/accounting';
import { july2026 } from './mocks/july2026';

export class MockAccountingRepository implements AccountingRepository {
  async getCurrentMonth(): Promise<AccountingMonth> {
    return july2026;
  }

  async getMonth(_id: string): Promise<AccountingMonth> {
    return july2026;
  }

  async getDocumentsForRange(_month: string, _months: number): Promise<AccountingLine[]> {
    return [...july2026.income, ...july2026.costs];
  }

  async getPaymentHistory(_month: string, _type?: string): Promise<PaymentHistoryLine[]> {
    return [];
  }
}

export const accountingRepository: AccountingRepository =
  new MockAccountingRepository();
