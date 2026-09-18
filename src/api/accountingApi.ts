import { HttpClient } from './client';
import { accountingPaths } from './accountingPaths';
import { AccountingDocumentDto, AccountingMonthOverviewDto, CandidateDto, CounterpartyDto, DocumentMutationDto, PaymentHistoryDto, ReviewedDocumentDto } from './dto/accounting';

export class AccountingApi {
  constructor(private readonly client: HttpClient) {}

  getMonth(profileId: number, month: string): Promise<AccountingMonthOverviewDto> {
    return this.client.get(accountingPaths.mobileMonth(profileId, month));
  }

  getDocuments(profileId: number, month: string): Promise<AccountingDocumentDto[]> {
    return this.client.get(accountingPaths.mobileDocuments(profileId, month));
  }

  getPaymentHistory(profileId: number, from: string, to: string, type?: string): Promise<PaymentHistoryDto[]> {
    const query = new URLSearchParams({ from, to });
    if (type) query.set('type', type);
    return this.client.get(`${accountingPaths.paymentHistory(profileId)}?${query.toString()}`);
  }

  getCounterparties(profileId: number): Promise<CounterpartyDto[]> {
    return this.client.get(accountingPaths.counterparties(profileId));
  }

  recognizeDocument(profileId: number, file: { uri: string; name: string; type: string }): Promise<CandidateDto> {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    return this.client.postForm(accountingPaths.recognizeDocument(profileId), form);
  }

  saveReviewedDocument(profileId: number, document: ReviewedDocumentDto): Promise<DocumentMutationDto> {
    return this.client.post(accountingPaths.documents(profileId), document);
  }
}
