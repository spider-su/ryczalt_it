import { AccountingLine, AccountingMonth } from '../model/accounting';

export interface AccountingRepository {
  getCurrentMonth(): Promise<AccountingMonth>;
  getMonth(id: string): Promise<AccountingMonth>;
  getDocumentsForRange(month: string, months: number): Promise<AccountingLine[]>;
}
