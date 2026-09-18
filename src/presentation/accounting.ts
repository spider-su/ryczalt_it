import { AccountingIssue, AccountingLine, PaymentLine } from '../model/accounting';

export type PresentationStatus = 'resolved' | 'informational' | 'requires_action' | 'error';

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
