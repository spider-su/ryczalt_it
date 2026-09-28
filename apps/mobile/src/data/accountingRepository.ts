import type { AccountingIssue, AccountingPeriod, Counterparty, CounterpartyRule, Invoice, Obligation, PaymentHistoryLine, Transaction } from '../model/accounting';

export type AccountingMonthParts = {
  period: AccountingPeriod | null;
  invoices: Invoice[] | null;
  transactions: Transaction[] | null;
  obligations: Obligation[] | null;
  issues: AccountingIssue[] | null;
  failures: Partial<Record<'period' | 'invoices' | 'transactions' | 'obligations' | 'issues', unknown>>;
};

export function mergeAccountingMonthParts(
  previous: AccountingMonthParts | null,
  incoming: AccountingMonthParts,
  previousMonth: string | null,
  month: string,
): AccountingMonthParts {
  if (!previous || previousMonth !== month) return incoming;
  return {
    period: incoming.failures.period ? previous.period : incoming.period,
    invoices: incoming.failures.invoices ? previous.invoices : incoming.invoices,
    transactions: incoming.failures.transactions ? previous.transactions : incoming.transactions,
    obligations: incoming.failures.obligations ? previous.obligations : incoming.obligations,
    issues: incoming.failures.issues ? previous.issues : incoming.issues,
    failures: incoming.failures,
  };
}

export interface AccountingRepository {
  getPeriods(): Promise<unknown[]>;
  getMonth(month: string): Promise<AccountingPeriod>;
  getMonthParts(month: string): Promise<AccountingMonthParts>;
  getInvoicesForRange(month: string, months: number): Promise<Invoice[]>;
  getCounterpartyInvoices(counterpartyId: string): Promise<Invoice[]>;
  markInvoiceManuallyPaid(invoiceId: string, paidDate: string, note?: string): Promise<void>;
  clearInvoiceManualPayment(invoiceId: string): Promise<void>;
  markObligationManuallyPaid(month: string, obligationId: string, paidDate: string, note?: string): Promise<void>;
  clearObligationManualPayment(month: string, obligationId: string): Promise<void>;
  getPaymentHistory(month: string, type?: string): Promise<PaymentHistoryLine[]>;
  getCounterparties(): Promise<Counterparty[]>;
  getCounterpartyRules(counterpartyId: string): Promise<CounterpartyRule[]>;
  calculatePeriod(month: string): Promise<void>;
  performPeriodAction(month: string, action: 'FREEZE' | 'REOPEN'): Promise<void>;
}
