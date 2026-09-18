import { HttpClient } from './client';
import { AccountingDocumentDto, AccountingMonthOverviewDto, CandidateDto, CounterpartyDto, ReviewedDocumentDto } from './dto/accounting';

export class AccountingApi {
  constructor(private readonly client: HttpClient) {}

  getMonth(profileId: number, month: string): Promise<AccountingMonthOverviewDto> {
    return this.client.get(`/api/v1/profiles/${profileId}/accounting/months/${month}`);
  }

  getDocuments(profileId: number, month: string): Promise<AccountingDocumentDto[]> {
    return this.client.get(`/api/v1/profiles/${profileId}/accounting/months/${month}/documents`);
  }

  getCounterparties(profileId: number): Promise<CounterpartyDto[]> {
    return this.client.get(`/api/profiles/${profileId}/accounting/counterparties`);
  }

  recognizeDocument(profileId: number, file: { uri: string; name: string; type: string }): Promise<CandidateDto> {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    return this.client.postForm(`/api/profiles/${profileId}/accounting/documents/recognize`, form);
  }

  saveReviewedDocument(profileId: number, document: ReviewedDocumentDto): Promise<void> {
    return this.client.postVoid(`/api/profiles/${profileId}/accounting/documents`, document);
  }
}
