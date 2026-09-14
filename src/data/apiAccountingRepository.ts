import { AccountingApi } from '../api/accountingApi';
import { mapAccountingMonth } from '../api/mappers/accountingMapper';
import { AccountingRepository } from './accountingRepository';
import { AccountingMonth } from '../model/accounting';

export class ApiAccountingRepository implements AccountingRepository {
  constructor(private readonly api: AccountingApi, private readonly profileId: number) {}

  async getCurrentMonth(): Promise<AccountingMonth> {
    return this.getMonth(new Date().toISOString().slice(0, 7));
  }

  async getMonth(month: string): Promise<AccountingMonth> {
    const [overview, documents] = await Promise.all([
      this.api.getMonth(this.profileId, month),
      this.api.getDocuments(this.profileId, month)
    ]);
    return mapAccountingMonth(overview, documents);
  }
}
