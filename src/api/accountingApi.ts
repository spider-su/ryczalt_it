import { HttpClient } from './client';
import { accountingPaths } from './accountingPaths';
import type { AccountingIssueDto, AccountingPeriodDto, CounterpartyDto, CounterpartyRuleDto, InvoiceCandidateDto, InvoiceCreateDto, InvoiceDto, InvoiceResultDto, ObligationDto, PaymentDto, TransactionDto } from './dto/accounting';

export class AccountingApi {
  constructor(private readonly client: HttpClient) {}
  getPeriods(profileId: number): Promise<unknown[]> { return this.client.get(accountingPaths.periods(profileId)); }
  getPeriod(profileId: number, month: string): Promise<AccountingPeriodDto> { return this.client.get(accountingPaths.period(profileId, month)); }
  getInvoices(profileId: number, month: string): Promise<InvoiceDto[]> { return this.client.get(accountingPaths.invoices(profileId, month)); }
  getCounterpartyInvoices(profileId: number, counterpartyId: string | number): Promise<InvoiceDto[]> { return this.client.get(accountingPaths.counterpartyInvoices(profileId, counterpartyId)); }
  markInvoiceManuallyPaid(profileId: number, invoiceId: string | number, paidDate: string, note?: string): Promise<void> { return this.client.postVoid(accountingPaths.manualPaid(profileId, invoiceId), { paidDate, note: note || null }); }
  clearInvoiceManualPayment(profileId: number, invoiceId: string | number): Promise<void> { return this.client.delete(accountingPaths.manualPaid(profileId, invoiceId)); }
  getTransactions(profileId: number, month: string): Promise<TransactionDto[]> { return this.client.get(accountingPaths.transactions(profileId, month)); }
  getObligations(profileId: number, month: string): Promise<ObligationDto[]> { return this.client.get(accountingPaths.obligations(profileId, month)); }
  getIssues(profileId: number, month: string): Promise<AccountingIssueDto[]> { return this.client.get(accountingPaths.issues(profileId, month)); }
  getPayments(profileId: number, from: string, to: string, type?: string): Promise<PaymentDto[]> { const query = new URLSearchParams({ from, to }); if (type) query.set('type', type); return this.client.get(`${accountingPaths.payments(profileId)}?${query.toString()}`); }
  getCounterparties(profileId: number): Promise<CounterpartyDto[]> { return this.client.get(accountingPaths.counterparties(profileId)); }
  getCounterparty(profileId: number, id: string): Promise<CounterpartyDto> { return this.client.get(accountingPaths.counterparty(profileId, id)); }
  updateCounterpartyAlias(profileId: number, id: string, alias: string): Promise<CounterpartyDto> { return this.client.put(accountingPaths.counterpartyAlias(profileId, id), { alias }); }
  getCounterpartyRules(profileId: number, id: string): Promise<CounterpartyRuleDto[]> { return this.client.get(accountingPaths.rules(profileId, id)); }
  createCounterpartyRule(profileId: number, id: string, rule: Record<string, unknown>): Promise<CounterpartyRuleDto> { return this.client.post(accountingPaths.rules(profileId, id), rule); }
  updateCounterpartyRule(profileId: number, id: string, ruleId: string, rule: Record<string, unknown>): Promise<CounterpartyRuleDto> { return this.client.put(accountingPaths.rule(profileId, id, ruleId), rule); }
  deleteCounterpartyRule(profileId: number, id: string, ruleId: string): Promise<void> { return this.client.delete(accountingPaths.rule(profileId, id, ruleId)); }
  recognizeInvoice(profileId: number, file: { uri: string; name: string; type: string }): Promise<InvoiceCandidateDto> { const form = new FormData(); form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob); return this.client.postForm(accountingPaths.recognizeInvoice(profileId), form); }
  createInvoice(profileId: number, invoice: InvoiceCreateDto): Promise<InvoiceResultDto> { return this.client.post(accountingPaths.invoicesCreate(profileId), invoice); }
  settle(profileId: number, month: string): Promise<void> { return this.client.postVoid(accountingPaths.settle(profileId, month), {}); }
  freeze(profileId: number, month: string): Promise<void> { return this.client.postVoid(accountingPaths.freeze(profileId, month), { reason: 'Requested from mobile client' }); }
  reopen(profileId: number, month: string): Promise<void> { return this.client.postVoid(accountingPaths.reopen(profileId, month), { reason: 'Requested from mobile client' }); }
}
