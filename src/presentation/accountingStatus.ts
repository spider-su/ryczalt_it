import { BankSummary, FilingSummary, ReconciliationSummary } from '../model/accounting';

export type StatusView = { state: 'success' | 'attention' | 'pending' | 'error' | 'unknown'; labelKey: string };

export function documentProcessingView(value: string | null | undefined): StatusView {
  switch (value?.trim().toUpperCase()) {
    case 'RECEIVED': return { state: 'pending', labelKey: 'status.documentReceived' };
    case 'PARSED':
    case 'STAGED': return { state: 'pending', labelKey: 'status.documentParsed' };
    case 'IMPORTED':
    case 'PROMOTED':
    case 'CREATED': return { state: 'success', labelKey: 'status.documentImported' };
    case 'FAILED': return { state: 'error', labelKey: 'status.documentFailed' };
    default: return { state: 'unknown', labelKey: 'status.unknown' };
  }
}

export function documentReviewView(value: string | null | undefined): StatusView {
  switch (value?.trim().toUpperCase()) {
    case 'REVIEW_REQUIRED': return { state: 'attention', labelKey: 'status.documentReviewRequired' };
    case 'REVIEWED': return { state: 'success', labelKey: 'status.documentReviewed' };
    default: return { state: 'unknown', labelKey: 'status.unknown' };
  }
}

export function ksefStatusView(value: string | null | undefined): StatusView {
  switch (value?.trim().toUpperCase()) {
    case 'CONNECTED': return { state: 'success', labelKey: 'status.ksefConnected' };
    case 'NOT_CONFIGURED': return { state: 'pending', labelKey: 'status.ksefNotConfigured' };
    default: return { state: 'unknown', labelKey: 'status.unknown' };
  }
}

export function bankStatusView(summary: BankSummary): StatusView {
  switch (summary.state) {
    case 'matched': return { state: 'success', labelKey: 'status.bankMatched' };
    case 'unmatched': return { state: 'attention', labelKey: 'status.bankUnmatched' };
    case 'pending': return { state: 'pending', labelKey: 'status.bankPending' };
    case 'failed': return { state: 'error', labelKey: 'status.bankFailed' };
    case 'unavailable': return { state: 'pending', labelKey: 'status.bankNoImport' };
    default: return { state: 'unknown', labelKey: 'status.unknown' };
  }
}

export function reconciliationStatusView(summary: ReconciliationSummary): StatusView {
  switch (summary.state) {
    case 'healthy': return { state: 'success', labelKey: 'status.reconciliationHealthy' };
    case 'mismatch': return { state: 'attention', labelKey: 'status.reconciliationMismatch' };
    case 'missing_evidence': return { state: 'attention', labelKey: 'status.reconciliationMissingEvidence' };
    default: return { state: 'unknown', labelKey: 'status.unknown' };
  }
}

export function filingStatusView(summary: FilingSummary): StatusView {
  if (summary.ready === true) return { state: 'success', labelKey: 'status.filingReady' };
  if (summary.ready === false && summary.issues.length > 0) return { state: 'attention', labelKey: 'status.filingNeedsAttention' };
  if (summary.ready === false) return { state: 'pending', labelKey: 'status.filingPending' };
  return { state: 'unknown', labelKey: 'status.unknown' };
}

export function jpkStatusView(value: string | null | undefined): StatusView {
  switch (value?.trim().toUpperCase()) {
    case 'GENERATED':
    case 'VALID': return { state: 'success', labelKey: 'status.jpkGenerated' };
    case 'SUBMITTED': return { state: 'success', labelKey: 'status.jpkSubmitted' };
    case 'INVALID': return { state: 'error', labelKey: 'status.jpkInvalid' };
    case 'MISSING': return { state: 'pending', labelKey: 'status.jpkMissing' };
    default: return { state: 'unknown', labelKey: 'status.unknown' };
  }
}

export function upoStatusView(value: string | null | undefined): StatusView {
  switch (value?.trim().toUpperCase()) {
    case 'ACCEPTED':
    case 'POSTED': return { state: 'success', labelKey: 'status.upoReceived' };
    case 'REJECTED': return { state: 'error', labelKey: 'status.upoRejected' };
    case 'MISSING': return { state: 'pending', labelKey: 'status.upoMissing' };
    default: return { state: 'unknown', labelKey: 'status.unknown' };
  }
}

export function lifecycleStatusView(value: string | null | undefined): StatusView {
  const normalized = value?.trim().toUpperCase();
  switch (normalized) {
    case 'OPEN':
    case 'SOURCES_INCOMPLETE':
    case 'READY_FOR_REVIEW':
    case 'ISSUES':
    case 'CONFIRMED':
    case 'FILED':
    case 'PAID':
    case 'SETTLED':
    case 'LOCKED': return { state: normalized === 'ISSUES' ? 'attention' : 'pending', labelKey: `status.lifecycle.${normalized.toLowerCase()}` };
    default: return { state: 'unknown', labelKey: 'status.unknown' };
  }
}
