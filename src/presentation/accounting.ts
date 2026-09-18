import { AccountingIssue, AccountingLine, PaymentLine } from '../model/accounting';

export type PresentationStatus = 'resolved' | 'informational' | 'requires_action' | 'error' | 'processing';

export function statusForMonth(month: { lifecycle?: string; nextAction?: string; issues: AccountingIssue[] }): PresentationStatus {
  if (month.issues.some((issue) => statusForIssue(issue) === 'error')) return 'error';
  if (month.issues.some((issue) => statusForIssue(issue) === 'requires_action')) return 'requires_action';
  const action = `${month.nextAction ?? ''} ${month.lifecycle ?? ''}`.toUpperCase();
  if (['PROCESSING', 'SYNCING', 'IN_PROGRESS'].some((value) => action.includes(value))) return 'processing';
  if (month.issues.some((issue) => statusForIssue(issue) === 'informational')) return 'informational';
  return 'resolved';
}

export function issuePriority(issue: AccountingIssue): number {
  const status = statusForIssue(issue);
  return status === 'error' ? 0 : status === 'requires_action' ? 1 : 2;
}

export function orderedIssues(issues: AccountingIssue[]): AccountingIssue[] {
  return [...issues].sort((a, b) => issuePriority(a) - issuePriority(b));
}

export function statusForIssue(issue: AccountingIssue): PresentationStatus {
  const severity = issue.severity.toUpperCase();
  if (severity === 'ERROR' || severity === 'CRITICAL') return 'error';
  if (issue.kind.toUpperCase() === 'INFO') return 'informational';
  return 'requires_action';
}

export function statusForPayment(payment: PaymentLine): PresentationStatus {
  const status = payment.status.toUpperCase();
  if (status === 'PAID' || status === 'SETTLED' || status === 'MATCHED') return 'resolved';
  if (status === 'OVERDUE') return 'error';
  return 'requires_action';
}

export function matchesInvoice(line: AccountingLine, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('pl-PL');
  if (!needle) return true;
  return [line.counterparty, line.documentNumber, line.nip, line.title, line.subtitle]
    .filter(Boolean).some((value) => value!.toLocaleLowerCase('pl-PL').includes(needle));
}

export function paymentMatches(line: AccountingLine, filter: 'ALL' | 'PAID' | 'UNPAID' | 'OVERDUE'): boolean {
  if (filter === 'ALL') return true;
  const status = line.paymentStatus?.toUpperCase();
  if (filter === 'PAID') return ['PAID', 'SETTLED', 'MATCHED'].includes(status ?? '');
  if (filter === 'OVERDUE') return status === 'OVERDUE';
  return !['PAID', 'SETTLED', 'MATCHED', 'OVERDUE'].includes(status ?? '');
}

export function dateMatches(line: AccountingLine, filter: 'ALL' | 'THIS_MONTH' | 'PREVIOUS_MONTH' | 'LAST_3_MONTHS', month: string): boolean {
  if (filter === 'ALL' || !line.issueDate) return true;
  const date = new Date(`${line.issueDate.slice(0, 10)}T00:00:00Z`);
  const current = new Date(`${month}-01T00:00:00Z`);
  const difference = (current.getUTCFullYear() - date.getUTCFullYear()) * 12 + current.getUTCMonth() - date.getUTCMonth();
  return filter === 'THIS_MONTH' ? difference === 0 : filter === 'PREVIOUS_MONTH' ? difference === 1 : difference >= 0 && difference < 3;
}
