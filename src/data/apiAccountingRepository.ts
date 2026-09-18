import { AccountingApi } from '../api/accountingApi';
import { mapAccountingMonth } from '../api/mappers/accountingMapper';
import { AccountingRepository } from './accountingRepository';
import { AccountingLine, AccountingMonth } from '../model/accounting';

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

  async getDocumentsForRange(month: string, months: number): Promise<AccountingLine[]> {
    const ids = Array.from({ length: Math.max(1, months) }, (_, index) => shiftMonth(month, -index));
    const values = await Promise.all(ids.map((id) => this.getMonth(id)));
    return values.flatMap((value) => [...value.income, ...value.costs]);
  }
}

function shiftMonth(value: string, offset: number): string {
  const date = new Date(`${value}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
