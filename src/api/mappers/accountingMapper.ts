import type { AccountingIssueDto, AccountingPeriodDto, CounterpartyDto, Decimal, InvoiceDto, ObligationDto, PaymentDto, ReconciliationDto, TransactionDto } from '../dto/accounting';
import type { AccountingIssue, AccountingPeriod, Counterparty, Invoice, Money, Obligation, PaymentHistoryLine, Transaction } from '../../model/accounting';

export function decimalString(value: Decimal | null | undefined): string | null {
  if (value == null || typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw new Error('Accounting response contains an invalid decimal amount');
  return value;
}
function money(value: Decimal | null | undefined, currency?: string | null): Money { return { amount: value == null ? null : decimalString(value), currency: currency ?? null }; }
function dateOnly(value: string | null | undefined): string | null { return value ? value.slice(0, 10) : null; }

export function mapDirection(type: string | null | undefined): Invoice['direction'] { const value = type?.toUpperCase(); if (['SALE', 'SALES', 'INCOME'].includes(value ?? '')) return 'SALE'; if (['PURCHASE', 'PURCHASES', 'COST', 'COSTS'].includes(value ?? '')) return 'PURCHASE'; return 'UNKNOWN'; }
export function mapInvoice(invoice: InvoiceDto): Invoice {
  const display = invoice.reference || 'Unknown invoice';
  const counterparty = invoice.counterparty;
  return { id: String(invoice.id), title: counterparty?.alias || counterparty?.legalName || display, subtitle: [invoice.reference, dateOnly(invoice.issueDate), invoice.currency].filter(Boolean).join(' · '), amount: money(invoice.grossAmount, invoice.currency), direction: mapDirection(invoice.direction), counterparty: counterparty?.alias || counterparty?.legalName || null, legalName: counterparty?.legalName ?? null, alias: counterparty?.alias ?? null, taxIdentifier: null, documentNumber: invoice.reference, issueDate: dateOnly(invoice.issueDate ?? invoice.accountingDate), currency: invoice.currency, importStatus: null, approvalStatus: invoice.approvalStatus, approvalSource: invoice.approvalMethod, paymentVerificationPolicy: invoice.paymentVerificationPolicy, paymentStatus: null, source: null, category: null, sourceType: null, documentKind: null, correctsInvoiceId: null, correctsInvoiceReference: null };
}
export function mapInvoices(invoices: InvoiceDto[]): Invoice[] { return invoices.map(mapInvoice); }
export function mapTransaction(transaction: TransactionDto): Transaction { return { id: String(transaction.id), date: dateOnly(transaction.bookingDate), description: transaction.description || transaction.reference, amount: money(transaction.amount, transaction.currency), status: transaction.matchedAmount == null ? null : 'MATCHED' }; }
export function mapTransactions(transactions: TransactionDto[]): Transaction[] { return transactions.map(mapTransaction); }
export function mapObligation(obligation: ObligationDto): Obligation { return { id: String(obligation.id), title: obligation.type, period: '', dueDate: dateOnly(obligation.dueDate), amount: money(obligation.expectedAmount, obligation.currency), paidAmount: money(obligation.paidAmount, obligation.currency), outstandingAmount: money(obligation.outstandingAmount, obligation.currency), status: obligation.status?.trim() || 'UNKNOWN' }; }
export function mapObligations(obligations: ObligationDto[]): Obligation[] { return obligations.map(mapObligation); }
export function mapPaymentHistory(payments: PaymentDto[]): PaymentHistoryLine[] { return payments.map((payment) => ({ ...mapObligation(payment), paymentDate: dateOnly(payment.paymentDate) })); }
export function mapIssue(issue: AccountingIssueDto): AccountingIssue { return { id: issue.id, code: issue.code || 'UNKNOWN_ISSUE', severity: issue.severity || 'UNKNOWN', kind: issue.kind || 'UNKNOWN', title: issue.title, message: issue.message, sourceReference: issue.sourceReference }; }
export function mapIssues(issues: AccountingIssueDto[]): AccountingIssue[] { return issues.map(mapIssue); }
export function mapReconciliation(summary: ReconciliationDto): AccountingPeriod['reconciliation'] { const state = summary.missingEvidenceCount > 0 ? 'missing_evidence' : summary.mismatchCount > 0 ? 'mismatch' : summary.settledCount === summary.rowCount ? 'healthy' : 'unknown'; return { ...summary, state }; }
export function mapPeriod(period: AccountingPeriodDto, invoices: InvoiceDto[] = [], transactions: TransactionDto[] = [], obligations: ObligationDto[] = [], issues: AccountingIssueDto[] = []): AccountingPeriod {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period.month)) throw new Error('Accounting response contains an invalid month');
  return { id: period.month, status: period.status || 'UNKNOWN', summary: { revenue: money(period.summary.revenue), ryczalt: money(period.summary.ryczalt), vat: money(period.summary.vat), zus: money(period.summary.zus) }, documents: period.documents, settlement: { ...period.settlement, totalExpected: money(period.settlement.totalExpected), totalPaid: money(period.settlement.totalPaid), totalOutstanding: money(period.settlement.totalOutstanding) }, reconciliation: mapReconciliation(period.reconciliation), completeness: period.completeness, allowedActions: [...(period.allowedActions ?? [])], invoices: mapInvoices(invoices), transactions: mapTransactions(transactions), obligations: mapObligations(obligations), issues: mapIssues(issues) };
}
export function mapCounterparty(value: CounterpartyDto): Counterparty { const legalName = value.legalName; const alias = value.alias ?? null; return { id: String(value.id), legalName, alias, displayName: value.displayName || alias || legalName, taxIdentifier: value.taxIdentifier, country: value.country, ruleCount: value.ruleCount ?? 0, invoiceCount: value.invoiceCount ?? 0 }; }
