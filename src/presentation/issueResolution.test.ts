import { describe, expect, it } from 'vitest';
import { resolveIssueAction } from './issueResolution';
import type { AccountingIssue, AccountingLine } from '../model/accounting';

const document: AccountingLine = { id: 'doc-1', title: 'Supplier', source: 'source-1', amount: { amount: '10.00', currency: 'PLN' } };
const issue = (overrides: Partial<AccountingIssue> = {}): AccountingIssue => ({
  id: 'issue-1', code: 'ISSUE', severity: 'WARNING', kind: 'NEEDS_ANSWER', title: 'Issue', message: 'Issue',
  resolution: { type: 'NONE', command: null, options: [], settingsPath: null, actionLabel: null, reason: 'No safe action is available yet.' },
  ...overrides
});

describe('issue resolution routing', () => {
  it('routes only an exact known source reference for a SOURCE issue', () => {
    expect(resolveIssueAction(issue({ code: 'SOURCE_REVIEW_REQUIRED', sourceReference: 'source-1' }), [document])).toEqual({ kind: 'SUPPORTED_NAVIGATION', destination: 'document', document });
    expect(resolveIssueAction(issue({ code: 'RECONCILIATION_REVIEW', sourceReference: 'source-1' }), [document]).kind).toBe('DISPLAY_ONLY');
    expect(resolveIssueAction(issue({ sourceReference: 'unknown-source' }), [document]).kind).toBe('DISPLAY_ONLY');
    expect(resolveIssueAction(issue({ sourceReference: null }), [document]).kind).toBe('DISPLAY_ONLY');
  });

  it('keeps setup display-only when no mobile destination exists', () => {
    expect(resolveIssueAction(issue({ resolution: { type: 'SETUP', command: null, options: [], settingsPath: '/accounting', actionLabel: 'Open', reason: null } })).kind).toBe('DISPLAY_ONLY');
  });

  it('does not execute or guess choice, match, missing, or unknown commands', () => {
    expect(resolveIssueAction(issue({ resolution: { type: 'CHOICE', command: 'reviewSource', options: [{ value: 'a', label: 'A', recommended: false }], settingsPath: null, actionLabel: null, reason: null } })).kind).toBe('BACKEND_COMMAND_NOT_EXPOSED');
    expect(resolveIssueAction(issue({ resolution: { type: 'MATCH', command: null, options: [], settingsPath: null, actionLabel: null, reason: null } })).kind).toBe('UNKNOWN');
    expect(resolveIssueAction(issue({ resolution: { type: 'NEW_TYPE', command: 'newCommand', options: [], settingsPath: null, actionLabel: null, reason: null } })).kind).toBe('UNKNOWN');
  });

  it('fails closed when a malformed issue has no resolution object', () => {
    expect(resolveIssueAction(issue({ resolution: undefined as never }))).toEqual({ kind: 'UNKNOWN' });
  });
});
