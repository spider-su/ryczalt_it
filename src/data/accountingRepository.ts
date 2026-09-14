import { AccountingMonth } from '../model/accounting';

export interface AccountingRepository {
  getCurrentMonth(): Promise<AccountingMonth>;
  getMonth(id: string): Promise<AccountingMonth>;
}
