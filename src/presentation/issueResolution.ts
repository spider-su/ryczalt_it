import { AccountingIssue, AccountingLine } from '../model/accounting';

export type IssueAction =
  | { kind: 'SUPPORTED_NAVIGATION'; destination: 'document'; document: AccountingLine }
  | { kind: 'DISPLAY_ONLY'; reason?: string }
  | { kind: 'BACKEND_COMMAND_NOT_EXPOSED'; reason?: string }
  | { kind: 'UNKNOWN'; reason?: string };

export function resolveIssueAction(issue: AccountingIssue, documents: AccountingLine[] = []): IssueAction {
  const sourceReference = typeof issue.sourceReference === 'string' ? issue.sourceReference.trim() : undefined;
  // Backend evidence proves the namespace only for SOURCE_* issues: their reference
  // comes from accounting_source_evidence.external_reference, which documents expose
  // as sourceReference. Other issue references are invoice/bank references or absent.
  if (sourceReference && String(issue.code ?? '').trim().toUpperCase().startsWith('SOURCE_')) {
    const document = documents.find((item) => item.source?.trim() === sourceReference);
    if (document) return { kind: 'SUPPORTED_NAVIGATION', destination: 'document', document };
  }

  const type = String(issue.resolution?.type ?? '').trim().toUpperCase();
  const reason = issue.resolution?.reason?.trim() || undefined;
  if (type === 'NONE') return { kind: 'DISPLAY_ONLY', ...(reason ? { reason } : {}) };
  if (type === 'SETUP') return { kind: 'DISPLAY_ONLY', ...(reason ? { reason } : {}) };
  if (type === 'CHOICE' || type === 'MATCH') {
    return issue.resolution?.command?.trim()
      ? { kind: 'BACKEND_COMMAND_NOT_EXPOSED', ...(reason ? { reason } : {}) }
      : { kind: 'UNKNOWN', ...(reason ? { reason } : {}) };
  }
  return { kind: 'UNKNOWN', ...(reason ? { reason } : {}) };
}
