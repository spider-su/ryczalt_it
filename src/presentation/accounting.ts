import { AccountingIssue, AccountingPeriod, Invoice, Obligation } from '../model/accounting';
import { t } from '../i18n';

export type PresentationStatus = 'resolved' | 'informational' | 'requires_action' | 'setup_required' | 'error' | 'processing' | 'unknown';

export type HomeStatusCopy = { title: string; body: string };
export type HomeDataState = 'loading' | 'error' | 'ready';
export function homeDataState(month: object | null, error: boolean): HomeDataState {
  if (error) return 'error';
  return month ? 'ready' : 'loading';
}

export function homeStatusCopy(status: PresentationStatus): HomeStatusCopy {
  if (status === 'requires_action' || status === 'setup_required' || status === 'error') return { title: 'home.attentionTitle', body: 'home.attentionBody' };
  if (status === 'processing') return { title: 'home.processingTitle', body: 'home.processingBody' };
  if (status === 'resolved') return { title: 'home.healthyTitle', body: 'home.healthyBody' };
  if (status === 'informational') return { title: 'home.informationalTitle', body: 'home.informationalBody' };
  return { title: 'home.unknownTitle', body: 'home.unknownBody' };
}

export function statusForMonth(month: Pick<AccountingPeriod, 'completeness' | 'status' | 'issues' | 'allowedActions'>): PresentationStatus {
  if (month.issues.some((issue) => statusForIssue(issue) === 'error')) return 'error';
  if (month.issues.some((issue) => statusForIssue(issue) === 'requires_action' || statusForIssue(issue) === 'setup_required')) return 'requires_action';
  const status = month.status.toUpperCase();
  if (['PROCESSING', 'SYNCING', 'IN_PROGRESS', 'CALCULATING'].includes(status)) return 'processing';
  if (month.issues.some((issue) => statusForIssue(issue) === 'informational')) return 'informational';
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
  const status = String(payment.status ?? '').trim().toUpperCase();
  if (status === 'PAID' || status === 'OVERPAID') return 'resolved';
  if (status === 'OVERDUE') return 'error';
  if (status === 'NOT_DUE') return 'informational';
  if (status === 'OPEN' || status === 'PARTIALLY_PAID' || status === 'DUE') return 'requires_action';
  return 'unknown';
}

export function matchesInvoice(line: Invoice, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [line.counterparty, line.documentNumber, line.taxIdentifier, line.title, line.subtitle]
    .filter(Boolean).some((value) => value!.toLowerCase().includes(needle));
}

export function paymentMatches(line: Invoice, filter: 'ALL' | 'PAID' | 'UNPAID' | 'OVERDUE'): boolean {
  if (filter === 'ALL') return true;
  const status = line.paymentStatus?.toUpperCase();
  if (filter === 'PAID') return ['PAID', 'OVERPAID', 'MATCHED'].includes(status ?? '');
  if (filter === 'OVERDUE') return status === 'OVERDUE';
  return ['OPEN', 'PARTIALLY_PAID', 'DUE', 'UNMATCHED'].includes(status ?? '');
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
