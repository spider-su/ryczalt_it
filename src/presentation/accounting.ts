import { AccountingIssue, AccountingLine, PaymentLine } from '../model/accounting';
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

export function statusForMonth(month: { lifecycle?: string; nextAction?: string; issues: AccountingIssue[] }): PresentationStatus {
  if (month.issues.some((issue) => statusForIssue(issue) === 'error')) return 'error';
  if (month.issues.some((issue) => statusForIssue(issue) === 'requires_action' || statusForIssue(issue) === 'setup_required')) return 'requires_action';
  const lifecycle = (month.lifecycle ?? '').toUpperCase();
  const nextAction = (month.nextAction ?? '').toUpperCase();
  if (['PROCESSING', 'SYNCING', 'IN_PROGRESS'].includes(lifecycle) || ['PROCESSING', 'SYNCING', 'IN_PROGRESS'].includes(nextAction)) return 'processing';
  if (month.issues.some((issue) => statusForIssue(issue) === 'informational')) return 'informational';
  if (nextAction === 'NONE' || lifecycle === 'LOCKED') return 'resolved';
  if (['WAITING_FOR_SOURCE', 'REVIEW', 'CONFIRM', 'FILE', 'SETTLE', 'LOCK'].includes(nextAction)) return 'requires_action';
  if (['OPEN', 'SOURCES_INCOMPLETE', 'READY_FOR_REVIEW', 'ISSUES', 'CONFIRMED', 'FILED', 'PAID', 'SETTLED'].includes(lifecycle)) return 'informational';
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
  switch (issue.kind.toUpperCase()) {
    case 'INFO': return 'informational';
    case 'NEEDS_ANSWER': return 'requires_action';
    case 'SETUP': return 'setup_required';
    case 'BLOCKED': return 'error';
    default: return 'unknown';
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
  const code = issue.code.trim().toUpperCase();
  const copyKey = knownIssueCopy[code] ?? (code.startsWith('SOURCE_') ? 'review' : undefined);
  const title = copyKey ? `home.issueCodes.${copyKey}Title` : safeIssueText(issue.title, code, 'home.issueCodes.unknownTitle');
  const body = copyKey ? `home.issueCodes.${copyKey}Body` : safeIssueText(issue.message, code, 'home.issueCodes.unknownBody');
  return {
    status: statusForIssue(issue),
    title: t(title),
    body: t(body)
  };
}

export function statusForPayment(payment: PaymentLine): PresentationStatus {
  const status = payment.status.toUpperCase();
  if (status === 'PAID' || status === 'SETTLED' || status === 'MATCHED') return 'resolved';
  if (status === 'OVERDUE') return 'error';
  if (status === 'NOT_DUE') return 'informational';
  if (status === 'NOT_PAID' || status === 'DUE' || status === 'PARTIAL') return 'requires_action';
  return 'unknown';
}

export function matchesInvoice(line: AccountingLine, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [line.counterparty, line.documentNumber, line.nip, line.title, line.subtitle]
    .filter(Boolean).some((value) => value!.toLowerCase().includes(needle));
}

export function paymentMatches(line: AccountingLine, filter: 'ALL' | 'PAID' | 'UNPAID' | 'OVERDUE'): boolean {
  if (filter === 'ALL') return true;
  const status = line.paymentStatus?.toUpperCase();
  if (filter === 'PAID') return ['PAID', 'SETTLED', 'MATCHED'].includes(status ?? '');
  if (filter === 'OVERDUE') return status === 'OVERDUE';
  return ['NOT_PAID', 'DUE', 'PARTIAL'].includes(status ?? '');
}

export function dateMatches(line: AccountingLine, filter: 'ALL' | 'THIS_MONTH' | 'PREVIOUS_MONTH' | 'LAST_3_MONTHS', month: string): boolean {
  if (filter === 'ALL' || !line.issueDate) return true;
  const date = new Date(`${line.issueDate.slice(0, 10)}T00:00:00Z`);
  const current = new Date(`${month}-01T00:00:00Z`);
  const difference = (current.getUTCFullYear() - date.getUTCFullYear()) * 12 + current.getUTCMonth() - date.getUTCMonth();
  return filter === 'THIS_MONTH' ? difference === 0 : filter === 'PREVIOUS_MONTH' ? difference === 1 : difference >= 0 && difference < 3;
}
