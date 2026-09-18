import { AccountingLine, AccountingMonth, PaymentHistoryLine } from '../model/accounting';

export interface AccountingRepository {
  getCurrentMonth(): Promise<AccountingMonth>;
  getMonth(id: string): Promise<AccountingMonth>;
  getDocumentsForRange(month: string, months: number): Promise<AccountingLine[]>;
  getPaymentHistory(month: string, type?: string): Promise<PaymentHistoryLine[]>;
}
