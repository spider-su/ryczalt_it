import { AccountingRepository } from './accountingRepository';
import { AccountingMonth } from '../model/accounting';
import { july2026 } from './mocks/july2026';

export class MockAccountingRepository implements AccountingRepository {
  async getCurrentMonth(): Promise<AccountingMonth> {
    return july2026;
  }

  async getMonth(_id: string): Promise<AccountingMonth> {
    return july2026;
  }
}

export const accountingRepository: AccountingRepository =
  new MockAccountingRepository();
