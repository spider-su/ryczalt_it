import { HttpClient } from './client';
import { AccountingDocumentDto, AccountingMonthOverviewDto } from './dto/accounting';

export class AccountingApi {
  constructor(private readonly client: HttpClient) {}

  getMonth(profileId: number, month: string): Promise<AccountingMonthOverviewDto> {
    return this.client.get(`/api/v1/profiles/${profileId}/accounting/months/${month}`);
  }

  getDocuments(profileId: number, month: string): Promise<AccountingDocumentDto[]> {
    return this.client.get(`/api/v1/profiles/${profileId}/accounting/months/${month}/documents`);
  }
}
