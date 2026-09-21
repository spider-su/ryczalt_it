import type { AccountingPeriod, Counterparty, Invoice, PaymentHistoryLine } from '../model/accounting';

export interface AccountingRepository {
  getPeriods(): Promise<unknown[]>;
  getMonth(month: string): Promise<AccountingPeriod>;
  getInvoicesForRange(month: string, months: number): Promise<Invoice[]>;
  getCounterpartyInvoices(counterpartyId: string): Promise<Invoice[]>;
  markInvoiceManuallyPaid(invoiceId: string, paidDate: string, note?: string): Promise<void>;
  clearInvoiceManualPayment(invoiceId: string): Promise<void>;
  getPaymentHistory(month: string, type?: string): Promise<PaymentHistoryLine[]>;
  getCounterparties(): Promise<Counterparty[]>;
  performPeriodAction(month: string, action: 'SETTLE' | 'FREEZE' | 'REOPEN'): Promise<void>;
}
