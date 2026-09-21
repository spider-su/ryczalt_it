import { AccountingApi } from '../api/accountingApi';
import { mapCounterparty, mapInvoices, mapPaymentHistory, mapPeriod } from '../api/mappers/accountingMapper';
import type { AccountingRepository } from './accountingRepository';
import type { AccountingPeriod, Counterparty, Invoice, PaymentHistoryLine } from '../model/accounting';
import { currentLocalAccountingMonth } from '../utils/calendar';

export class ApiAccountingRepository implements AccountingRepository {
  constructor(private readonly api: AccountingApi, private readonly profileId: number) {}
  async getPeriods(): Promise<unknown[]> { return this.api.getPeriods(this.profileId); }
  async getMonth(month: string): Promise<AccountingPeriod> {
    const [period, invoices, transactions, obligations, issues] = await Promise.all([
      this.api.getPeriod(this.profileId, month), this.api.getInvoices(this.profileId, month), this.api.getTransactions(this.profileId, month), this.api.getObligations(this.profileId, month), this.api.getIssues(this.profileId, month)
    ]);
    return mapPeriod(period, invoices, transactions, obligations, issues);
  }
  async getInvoicesForRange(month: string, months: number): Promise<Invoice[]> { const ids = Array.from({ length: Math.max(1, months) }, (_, index) => shiftMonth(month, -index)); return mapInvoices((await Promise.all(ids.map((id) => this.api.getInvoices(this.profileId, id)))).flat()); }
  async getCounterpartyInvoices(counterpartyId: string): Promise<Invoice[]> { return mapInvoices(await this.api.getCounterpartyInvoices(this.profileId, counterpartyId)); }
  async markInvoiceManuallyPaid(invoiceId: string, paidDate: string, note?: string): Promise<void> { return this.api.markInvoiceManuallyPaid(this.profileId, invoiceId, paidDate, note); }
  async clearInvoiceManualPayment(invoiceId: string): Promise<void> { return this.api.clearInvoiceManualPayment(this.profileId, invoiceId); }
  async getPaymentHistory(month: string, type?: string): Promise<PaymentHistoryLine[]> { return mapPaymentHistory(await this.api.getPayments(this.profileId, month, month, type)); }
  async getCounterparties(): Promise<Counterparty[]> { return (await this.api.getCounterparties(this.profileId)).map(mapCounterparty); }
  async performPeriodAction(month: string, action: 'SETTLE' | 'FREEZE' | 'REOPEN'): Promise<void> { if (action === 'SETTLE') return this.api.settle(this.profileId, month); if (action === 'FREEZE') return this.api.freeze(this.profileId, month); return this.api.reopen(this.profileId, month); }
  getCurrentMonth(): Promise<AccountingPeriod> { return this.getMonth(currentLocalAccountingMonth()); }
}
function shiftMonth(value: string, offset: number): string { const date = new Date(`${value}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + offset); return date.toISOString().slice(0, 7); }
