import { AccountingIssue, Invoice } from '../model/accounting';

export type IssueAction =
  | { kind: 'SUPPORTED_NAVIGATION'; destination: 'invoice'; invoice: Invoice }
  | { kind: 'DISPLAY_ONLY'; reason?: string }
  | { kind: 'UNKNOWN'; reason?: string };

export function resolveIssueAction(issue: AccountingIssue, invoices: Invoice[] = []): IssueAction {
  const sourceReference = issue.sourceReference?.trim();
  if (sourceReference) {
    const invoice = invoices.find((item) => item.source?.trim() === sourceReference || item.id === sourceReference);
    if (invoice) return { kind: 'SUPPORTED_NAVIGATION', destination: 'invoice', invoice };
  }
  return issue.kind.toUpperCase() === 'INFO' ? { kind: 'DISPLAY_ONLY' } : { kind: 'UNKNOWN' };
}
