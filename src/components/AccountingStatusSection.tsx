import { completenessStatusLabel, periodActionLabel, periodStatusLabel, t } from '../i18n';
import { AccountingPeriod } from '../model/accounting';
import { ListGroup, KeyValueRow, Section } from './ui';
import { invoiceReviewPresentation } from '../presentation/accounting';

export function AccountingStatusSection({ period }: { period: AccountingPeriod | null }) {
  if (!period) return null;
  const reconciliation = period.reconciliation;
  const completeness = period.completeness.status.trim().toUpperCase();
  const completenessState = period.completeness.blockingIssueCount > 0 || completeness === 'INCOMPLETE' ? 'attention' : completeness === 'COMPLETE' ? 'success' : 'unknown';
  const reviewStatus = invoiceReviewPresentation(period.invoices);
  const reconciliationLabel = reconciliation.state === 'healthy' ? 'status.reconciliationHealthy' : reconciliation.state === 'mismatch' ? 'status.reconciliationMismatch' : reconciliation.state === 'missing_evidence' ? 'status.reconciliationMissingEvidence' : 'status.unknown';
  return <Section title={t('settlements.accountingStatus')} tone="secondary"><ListGroup>{reviewStatus ? <KeyValueRow label={t('settlements.documentReview')} value={t(reviewStatus.labelKey)} state={reviewStatus.state} /> : null}<KeyValueRow label={t('settlements.periodStatus')} value={periodStatusLabel(period.status)} /><KeyValueRow label={t('settlements.completeness')} value={completenessStatusLabel(period.completeness.status)} state={completenessState} /><KeyValueRow label={t('settlements.reconciliation')} value={t(reconciliationLabel)} state={reconciliation.state === 'healthy' ? 'success' : reconciliation.state === 'unknown' ? 'unknown' : 'attention'} /><KeyValueRow label={t('settlements.actions')} value={period.allowedActions.length ? period.allowedActions.map(periodActionLabel).join(', ') : t('common.unknown')} /></ListGroup></Section>;
}
