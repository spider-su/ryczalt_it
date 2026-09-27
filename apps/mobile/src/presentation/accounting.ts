import { AccountingIssue, AccountingPeriod, Invoice, Obligation } from '../model/accounting';
import { formatCurrency, paymentStatusLabel, t } from '../i18n';
import { invoiceClassificationLabel } from './invoiceList';

export type PresentationStatus = 'resolved' | 'informational' | 'settlement_pending' | 'calculations_pending' | 'requires_action' | 'setup_required' | 'error' | 'processing' | 'unknown';

export type HomeStatusCopy = { title: string; body: string };
export type HomeDataState = 'loading' | 'error' | 'ready';
export function homeDataState(month: object | null, error: boolean): HomeDataState {
  if (error) return 'error';
  return month ? 'ready' : 'loading';
}

export function homeStatusCopy(status: PresentationStatus): HomeStatusCopy {
  if (status === 'requires_action' || status === 'setup_required' || status === 'error') return { title: 'home.attentionTitle', body: 'home.attentionBody' };
  if (status === 'processing') return { title: 'home.processingTitle', body: 'home.processingBody' };
  if (status === 'calculations_pending') return { title: 'home.calculationsPendingTitle', body: 'home.calculationsPendingBody' };
  if (status === 'settlement_pending') return { title: 'home.settlementPendingTitle', body: 'home.settlementPendingBody' };
  if (status === 'resolved') return { title: 'home.healthyTitle', body: 'home.healthyBody' };
  if (status === 'informational') return { title: 'home.informationalTitle', body: 'home.informationalBody' };
  return { title: 'home.unknownTitle', body: 'home.unknownBody' };
}

export function calculationsReady(
  calculations: Pick<AccountingPeriod['calculations'][number], 'type' | 'status'>[],
  obligations: Pick<Obligation, 'title'>[] = []
): boolean {
  const readyStatuses = new Set(['CURRENT', 'CALCULATED', 'FROZEN']);
  if (calculations.length === 0) return false;
  // The API can include historical STALE rows alongside a current calculation
  // for the same type. Readiness is determined by whether each payable type has
  // a usable current result, not whether every historical row is current.
  const requiredTypes = obligations.length
    ? [...new Set(obligations.map((obligation) => String(obligation.title ?? '').trim().toUpperCase()))]
    : [...new Set(calculations.map((calculation) => String(calculation.type ?? '').trim().toUpperCase()))];
  return requiredTypes.every((requiredType) => {
    return calculations.some((calculation) => String(calculation.type ?? '').trim().toUpperCase() === requiredType
      && readyStatuses.has(String(calculation.status ?? '').trim().toUpperCase()));
  });
}

export function statusForMonth(month: Pick<AccountingPeriod, 'completeness' | 'status' | 'issues' | 'allowedActions' | 'calculations'> & { obligations: Pick<Obligation, 'title'>[]; settlement: Pick<AccountingPeriod['settlement'], 'fullySettled'> }): PresentationStatus {
  const actionableIssues = month.issues.filter((issue) => !isQuietIssue(issue));
  if (actionableIssues.some((issue) => statusForIssue(issue) === 'error')) return 'error';
  if (actionableIssues.some((issue) => statusForIssue(issue) === 'requires_action' || statusForIssue(issue) === 'setup_required')) return 'requires_action';
  const status = month.status.toUpperCase();
  if (['PROCESSING', 'SYNCING', 'IN_PROGRESS', 'CALCULATING'].includes(status)) return 'processing';
  if (!month.settlement.fullySettled && !calculationsReady(month.calculations, month.obligations)) return 'calculations_pending';
  if (actionableIssues.some((issue) => statusForIssue(issue) === 'informational')) return 'informational';
  if (month.settlement.fullySettled === false) return 'settlement_pending';
  if (month.completeness.status.toUpperCase() === 'COMPLETE' && month.completeness.blockingIssueCount === 0) return 'resolved';
  if (month.completeness.status.toUpperCase() !== 'UNKNOWN') return 'informational';
  return 'unknown';
}

export function issuePriority(issue: AccountingIssue): number {
  const status = statusForIssue(issue);
  return status === 'error' ? 0 : status === 'requires_action' || status === 'setup_required' ? 1 : status === 'informational' ? 2 : 3;
}

export function orderedIssues(issues: AccountingIssue[]): AccountingIssue[] {
  return [...issues].sort((a, b) => issuePriority(a) - issuePriority(b));
}

export function isQuietIssue(issue: Pick<AccountingIssue, 'code' | 'kind' | 'message'>): boolean {
  const code = String(issue.code ?? '').toUpperCase();
  const message = String(issue.message ?? '').toUpperCase();
  if (code === 'UNSETTLED_OBLIGATION' || String(issue.kind ?? '').toUpperCase() === 'SETTLEMENT') return true;
  return code.includes('MISSING_CALCULATION') || message.includes('NO CALCULATION IS AVAILABLE');
}

export function statusForIssue(issue: AccountingIssue): PresentationStatus {
  switch (String(issue.kind ?? '').toUpperCase()) {
    case 'INFO': return 'informational';
    case 'NEEDS_ANSWER': return 'requires_action';
    case 'SETUP': return 'setup_required';
    case 'BLOCKED': return 'error';
    default: return 'requires_action';
  }
}

const knownIssueCopy: Record<string, string> = {
  DIRTY_CALCULATION: 'dirtyCalculation',
  UNSUPPORTED_VAT_RATE: 'unsupportedVatRate',
  MISSING_VAT_CLASSIFICATION: 'review',
  MISSING_EXPLICIT_VAT_RATE: 'review',
  MISSING_COUNTERPARTY_IDENTIFIER: 'review',
  MISSING_JPK_EVIDENCE_CLASSIFICATION: 'review',
  SOURCE_REVIEW_REQUIRED: 'review',
  MISSING_PAYMENT_CONFIGURATION: 'setup',
  MISSING_TAXPAYER_CONFIGURATION: 'setup',
  MISSING_EFFECTIVE_TAX_PROFILE: 'setup',
  MISSING_ZUS_RULE_INPUT: 'setup'
};

function safeIssueText(value: string | null | undefined, code: string, fallback: string): string {
  const text = value?.trim();
  if (!text || text.toUpperCase() === code || /^[A-Z0-9_:-]+(?:\s*\([^)]*\))?$/.test(text)) return fallback;
  if (text.toUpperCase().startsWith(`${code}:`)) return fallback;
  return text;
}

export function issuePresentation(issue: AccountingIssue): {
  status: PresentationStatus;
  title: string;
  body: string;
} {
  const code = String(issue.code ?? '').trim().toUpperCase();
  const copyKey = knownIssueCopy[code] ?? (code.startsWith('SOURCE_') ? 'review' : undefined);
  const title = copyKey ? `home.issueCodes.${copyKey}Title` : safeIssueText(issue.title, code, 'home.issueCodes.unknownTitle');
  const body = copyKey ? `home.issueCodes.${copyKey}Body` : safeIssueText(issue.message, code, 'home.issueCodes.unknownBody');
  return {
    status: statusForIssue(issue),
    title: t(title),
    body: t(body)
  };
}

export function statusForPayment(payment: Obligation): PresentationStatus {
  const status = paymentStatusForDisplay(payment);
  if (status === 'PAID' || status === 'OVERPAID') return 'resolved';
  if (status === 'OVERDUE') return 'error';
  if (status === 'NOT_DUE') return 'informational';
  if (status === 'OPEN' || status === 'PARTIALLY_PAID' || status === 'DUE') return 'requires_action';
  return 'unknown';
}

export function paymentStatusForDisplay(payment: Pick<Obligation, 'status' | 'dueDate'>, today = localToday()): string {
  const status = String(payment.status ?? '').trim().toUpperCase();
  const dueDate = payment.dueDate;
  if (['OPEN', 'DUE', 'PARTIALLY_PAID'].includes(status) && dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) && dueDate < today) return 'OVERDUE';
  return status;
}

export function obligationStatusText(payment: Obligation, today?: string): string {
  const status = paymentStatusForDisplay(payment, today);
  const partiallyPaid = String(payment.status ?? '').trim().toUpperCase() === 'PARTIALLY_PAID';
  const label = paymentStatusLabel(status);
  return partiallyPaid ? `${label} (${formatCurrency(payment.outstandingAmount.amount)} ${t('settlements.remainingShort')})` : label;
}

function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function outstandingObligationsTotal(payments: Obligation[]): string {
  const eligible = payments.filter((payment) => ['OPEN', 'DUE', 'OVERDUE', 'PARTIALLY_PAID'].includes(String(payment.status ?? '').trim().toUpperCase()));
  const decimals = eligible.map((payment) => payment.outstandingAmount.amount).filter((value): value is string => typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value));
  const scale = Math.max(0, ...decimals.map((value) => value.split('.')[1]?.length ?? 0));
  const total = decimals.reduce((sum, value) => {
    const [whole = '0', fraction = ''] = value.split('.');
    return sum + BigInt(whole) * 10n ** BigInt(scale) + BigInt((fraction + '0'.repeat(scale)).slice(0, scale) || '0');
  }, 0n);
  if (scale === 0) return total.toString();
  const digits = total.toString().padStart(scale + 1, '0');
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

export function outstandingObligationsMoney(payments: Obligation[]): { amount: string; currency: string | null } {
  const eligible = payments.filter((payment) => ['OPEN', 'DUE', 'OVERDUE', 'PARTIALLY_PAID'].includes(String(payment.status ?? '').trim().toUpperCase()));
  const currencies = [...new Set(eligible.map((payment) => payment.outstandingAmount.currency || payment.amount.currency).filter((value): value is string => Boolean(value)))];
  return { amount: outstandingObligationsTotal(payments), currency: currencies.length === 1 ? currencies[0]! : null };
}

export function invoiceReviewPresentation(invoices: Pick<Invoice, 'approvalStatus'>[]): { labelKey: string; state: 'success' | 'attention' | 'unknown' } | null {
  const statuses = invoices.map((invoice) => invoice.approvalStatus?.trim().toUpperCase() ?? '');
  if (statuses.length === 0) return null;
  if (statuses.includes('NEEDS_REVIEW')) return { labelKey: 'settlements.reviewNeeded', state: 'attention' };
  if (statuses.every((status) => status === 'APPROVED')) return { labelKey: 'settlements.reviewComplete', state: 'success' };
  return { labelKey: 'common.unknown', state: 'unknown' };
}

export function homeInvoiceDirection(group: 'income' | 'costs'): 'SALE' | 'PURCHASE' {
  return group === 'income' ? 'SALE' : 'PURCHASE';
}

export function isUpcomingPayment(payment: Pick<Obligation, 'status'>): boolean {
  return ['OPEN', 'PARTIALLY_PAID', 'DUE', 'OVERDUE'].includes(String(payment.status ?? '').trim().toUpperCase());
}

export function isPaymentHistoryItem(payment: Pick<Obligation, 'status'>): boolean {
  return ['PAID', 'OVERPAID'].includes(String(payment.status ?? '').trim().toUpperCase());
}

export function areAllObligationsPaid(payments: Pick<Obligation, 'status'>[]): boolean {
  return payments.length > 0 && payments.every(isPaymentHistoryItem);
}

export type StatusTone = 'success' | 'warning' | 'muted';
export function invoiceStatusTone(status: string | null | undefined): StatusTone {
  const normalized = String(status ?? '').trim().toUpperCase();
  if (['MATCHED', 'MANUALLY_CONFIRMED'].includes(normalized)) return 'success';
  if (['UNMATCHED', 'PARTIALLY_MATCHED', 'NEEDS_REVIEW'].includes(normalized)) return 'warning';
  return 'muted';
}

export function matchesInvoice(line: Invoice, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const values = [line.counterparty, line.legalName, line.alias, line.documentNumber, line.taxIdentifier, line.title, line.subtitle, line.category, invoiceClassificationLabel(line.direction, line.category)].filter(Boolean) as string[];
  const normalizedNeedle = needle.replace(/[\s_-]/g, '');
  return values.some((value) => value.toLowerCase().includes(needle) || value.toLowerCase().replace(/[\s_-]/g, '').includes(normalizedNeedle));
}

export type InvoicePaymentFilter = 'ALL' | 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'NOT_REQUIRED';
export function invoicePaymentMatches(line: Invoice, filter: InvoicePaymentFilter): boolean {
  if (filter === 'ALL') return true;
  const status = line.paymentStatus?.trim().toUpperCase();
  if (filter === 'PAID') return ['MATCHED', 'MANUALLY_CONFIRMED'].includes(status ?? '');
  if (filter === 'PARTIALLY_PAID') return status === 'PARTIALLY_MATCHED';
  if (filter === 'UNPAID') return status === 'UNMATCHED';
  return status === 'NOT_REQUIRED';
}

export type DocumentDateRange = 'SELECTED_MONTH' | 'PREVIOUS_MONTH' | 'LAST_3_MONTHS';

function calendarMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])/.exec(value.trim());
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
}

export function dateMatches(line: Invoice, filter: DocumentDateRange, month: string): boolean {
  if (!line.issueDate) return false;
  const date = calendarMonth(line.issueDate);
  const current = calendarMonth(month);
  if (!date || !current) return false;
  const difference = (current.year - date.year) * 12 + current.month - date.month;
  return filter === 'SELECTED_MONTH' ? difference === 0 : filter === 'PREVIOUS_MONTH' ? difference === 1 : difference >= 0 && difference < 3;
}
