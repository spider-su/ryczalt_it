import { StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { AccountingStatus } from '../model/accounting';
import { filingStatusView, jpkStatusView, lifecycleStatusView, reconciliationStatusView, upoStatusView } from '../presentation/accountingStatus';
import { theme } from '../theme/theme';

export function AccountingStatusSection({ status }: { status: AccountingStatus | null }) {
  if (!status) return null;
  const filing = filingStatusView(status.filingSummary);
  const reconciliation = reconciliationStatusView(status.reconciliationSummary);
  const jpk = jpkStatusView(status.filingSummary.jpkStatus);
  const upo = upoStatusView(status.filingSummary.upoStatus);
  const lifecycle = lifecycleStatusView(status.lifecycle);
  return <View style={styles.container}><Text style={styles.title}>{t('settlements.accountingStatus')}</Text><View style={styles.card}><StatusRow label={t('settlements.lifecycle')} value={t(lifecycle.labelKey)} state={lifecycle.state} /><StatusRow label={t('settlements.filing')} value={t(filing.labelKey)} state={filing.state} /><StatusRow label={t('settlements.jpk')} value={t(jpk.labelKey)} state={jpk.state} /><StatusRow label={t('settlements.upo')} value={t(upo.labelKey)} state={upo.state} /><StatusRow label={t('settlements.reconciliation')} value={t(reconciliation.labelKey)} state={reconciliation.state} /></View></View>;
}

function StatusRow({ label, value, state }: { label: string; value: string; state: 'success' | 'attention' | 'pending' | 'error' | 'unknown' }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={[styles.value, state === 'success' && styles.success, state === 'attention' && styles.attention, state === 'error' && styles.error]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { marginTop: theme.spacing.xxl },
  title: { color: theme.colors.textPrimary, fontSize: theme.typography.section, fontWeight: '800', marginBottom: theme.spacing.sm },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, borderWidth: 1, borderColor: theme.colors.borderSubtle, paddingHorizontal: theme.spacing.lg },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.borderSubtle },
  label: { color: theme.colors.textSecondary },
  value: { color: theme.colors.textMuted, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  success: { color: theme.colors.success },
  attention: { color: theme.colors.warning },
  error: { color: theme.colors.danger }
});
