import { t } from '../i18n';
import { AccountingPeriod } from '../model/accounting';
import { ListGroup, KeyValueRow, Section } from './ui';

export function AccountingStatusSection({ period }: { period: AccountingPeriod | null }) {
  if (!period) return null;
  const reconciliation = period.reconciliation;
  const reconciliationLabel = reconciliation.state === 'healthy' ? 'status.reconciliationHealthy' : reconciliation.state === 'mismatch' ? 'status.reconciliationMismatch' : reconciliation.state === 'missing_evidence' ? 'status.reconciliationMissingEvidence' : 'status.unknown';
  return <Section title={t('settlements.accountingStatus')} tone="secondary"><ListGroup><KeyValueRow label={t('settlements.periodStatus')} value={period.status} /><KeyValueRow label={t('settlements.completeness')} value={period.completeness.status} state={period.completeness.blockingIssueCount > 0 ? 'attention' : 'success'} /><KeyValueRow label={t('settlements.reconciliation')} value={t(reconciliationLabel)} state={reconciliation.state === 'healthy' ? 'success' : reconciliation.state === 'unknown' ? 'unknown' : 'attention'} /><KeyValueRow label={t('settlements.actions')} value={period.allowedActions.length ? period.allowedActions.join(', ') : t('common.unknown')} /></ListGroup></Section>;
}
