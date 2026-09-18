import { AccountingApi } from '../api/accountingApi';
import { mapAccountingMonth, mapDocuments, mapPaymentHistory } from '../api/mappers/accountingMapper';
import { AccountingRepository } from './accountingRepository';
import { AccountingLine, AccountingMonth, PaymentHistoryLine } from '../model/accounting';
import { currentLocalAccountingMonth } from '../utils/calendar';

export class ApiAccountingRepository implements AccountingRepository {
  constructor(private readonly api: AccountingApi, private readonly profileId: number) {}

  async getCurrentMonth(): Promise<AccountingMonth> {
    return this.getMonth(currentLocalAccountingMonth());
  }

  async getMonth(month: string): Promise<AccountingMonth> {
    const [overview, documents] = await Promise.all([
      this.api.getMonth(this.profileId, month),
      this.api.getDocuments(this.profileId, month)
    ]);
    return mapAccountingMonth(overview, documents);
  }

  async getDocumentsForRange(month: string, months: number): Promise<AccountingLine[]> {
    const ids = Array.from({ length: Math.max(1, months) }, (_, index) => shiftMonth(month, -index));
    const values = await Promise.all(ids.map((id) => this.api.getDocuments(this.profileId, id)));
    return values.flatMap(mapDocuments);
  }

  async getPaymentHistory(month: string, type?: string): Promise<PaymentHistoryLine[]> {
    return mapPaymentHistory(await this.api.getPaymentHistory(this.profileId, month, month, type));
  }
}

function shiftMonth(value: string, offset: number): string {
  const date = new Date(`${value}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
