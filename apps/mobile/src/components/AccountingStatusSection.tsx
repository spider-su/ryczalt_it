import * as React from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { completenessStatusLabel, periodActionLabel, periodStatusLabel, t } from '../i18n';
import { AccountingPeriod } from '../model/accounting';
import { ListGroup, KeyValueRow, Section } from './ui';
import { homeStatusCopy, invoiceReviewPresentation, statusForMonth } from '../presentation/accounting';
import { theme } from '../theme/theme';

export function AccountingStatusSection({ period }: { period: AccountingPeriod | null }) {
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  if (!period) return null;
  const reconciliation = period.reconciliation;
  const completeness = period.completeness.status.trim().toUpperCase();
  const completenessState = period.completeness.blockingIssueCount > 0 || completeness === 'INCOMPLETE' ? 'attention' : completeness === 'COMPLETE' ? 'success' : 'unknown';
  const reviewStatus = invoiceReviewPresentation(period.invoices);
  const reconciliationLabel = reconciliation.state === 'healthy' ? 'status.reconciliationHealthy' : reconciliation.state === 'mismatch' ? 'status.reconciliationMismatch' : reconciliation.state === 'missing_evidence' ? 'status.reconciliationMissingEvidence' : 'status.unknown';
  const health = statusForMonth(period);
  const healthState = health === 'resolved' ? 'success' : health === 'unknown' ? 'unknown' : ['processing', 'informational'].includes(health) ? 'pending' : health === 'error' ? 'error' : 'attention';
  return <Section title={t('settlements.accountingStatus')} tone="secondary"><ListGroup><KeyValueRow label={t('settlements.overallHealth')} value={t(homeStatusCopy(health).title)} state={healthState} /></ListGroup><Pressable onPress={() => setDetailsOpen((open) => !open)} accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }} style={styles.detailsButton}><Text style={styles.detailsText}>{t(detailsOpen ? 'common.hideDetails' : 'common.showDetails')}</Text><Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.accent} /></Pressable>{detailsOpen ? <ListGroup>{reviewStatus ? <KeyValueRow label={t('settlements.documentReview')} value={t(reviewStatus.labelKey)} state={reviewStatus.state} /> : null}<KeyValueRow label={t('settlements.periodStatus')} value={periodStatusLabel(period.status)} /><KeyValueRow label={t('settlements.completeness')} value={completenessStatusLabel(period.completeness.status)} state={completenessState} /><KeyValueRow label={t('settlements.reconciliation')} value={t(reconciliationLabel)} state={reconciliation.state === 'healthy' ? 'success' : reconciliation.state === 'unknown' ? 'unknown' : 'attention'} />{period.allowedActions.length ? <KeyValueRow label={t('settlements.actions')} value={period.allowedActions.map(periodActionLabel).join(', ')} /> : null}</ListGroup> : null}</Section>;
}

const styles = { detailsButton: { minHeight: 44, alignSelf: 'flex-start' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm }, detailsText: { color: theme.colors.accent, fontWeight: '700' as const } };
