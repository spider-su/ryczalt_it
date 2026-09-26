import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Obligation } from '../model/accounting';
import { formatDate, formatMonth, paymentLabel, paymentStatusLabel, t } from '../i18n';
import { formatMoney } from '../utils/money';
import { createThemeStyles, theme } from '../theme/theme';
import { KeyValueRow, ListGroup, PrimaryButton, SheetHeader } from './ui';
import { paymentStatusForDisplay } from '../presentation/accounting';

export function ObligationDetailsModal({ item, busy, onClose, onMarkManuallyPaid }: {
  item: Obligation | null;
  busy: boolean;
  onClose: () => void;
  onMarkManuallyPaid: (obligation: Obligation) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { setConfirming(false); setError(false); }, [item]);
  if (!item) return null;

  const status = paymentStatusForDisplay(item);
  const payable = ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'].includes(status);
  async function confirmPayment() {
    setError(false);
    try { await onMarkManuallyPaid(item!); onClose(); } catch { setError(true); }
  }

  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}><View style={styles.sheet}>
    <SheetHeader title={paymentLabel(item.title)} onClose={onClose} />
    <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
    <ListGroup>
      <KeyValueRow label={t('settlements.period')} value={formatMonth(item.period)} />
      <KeyValueRow label={t('settlements.dueDate')} value={item.dueDate ? formatDate(item.dueDate) : t('settlements.dueDateUnavailable')} />
      <KeyValueRow label={t('settlements.amount')} value={formatMoney(item.amount)} />
      <KeyValueRow label={t('settlements.paidAmount')} value={formatMoney(item.paidAmount)} />
      <KeyValueRow label={t('settlements.remaining')} value={formatMoney(item.outstandingAmount)} />
      <KeyValueRow label={t('settlements.status')} value={paymentStatusLabel(status)} />
    </ListGroup>
    {payable ? confirming ? <View style={styles.confirmBox}>
      <Text style={styles.confirmCopy}>{t('settlements.manualPaidConfirmation')}</Text>
      {error ? <Text style={styles.error}>{t('settlements.manualPaidFailure')}</Text> : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirming(false)} style={styles.cancelButton}><Text style={styles.cancelText}>{t('common.cancel')}</Text></Pressable>
        <View style={styles.confirmButton}><PrimaryButton label={busy ? t('common.loading') : t('settlements.confirmManualPaid')} onPress={() => { void confirmPayment(); }} disabled={busy} /></View>
      </View>
    </View> : <PrimaryButton label={t('settlements.markPaidManually')} onPress={() => { setError(false); setConfirming(true); }} /> : null}
  </View></SafeAreaView></Modal>;
}

const styles = createThemeStyles({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.md },
  amount: { color: theme.colors.textPrimary, fontSize: theme.typography.amount, fontWeight: '800' },
  confirmBox: { padding: theme.spacing.md, borderRadius: theme.radius.control, backgroundColor: theme.colors.surfaceSecondary },
  confirmCopy: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, lineHeight: 20 },
  error: { color: theme.colors.danger, fontSize: theme.typography.supporting, marginTop: theme.spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.md },
  cancelButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: theme.spacing.md },
  cancelText: { color: theme.colors.textSecondary, fontWeight: '700' },
  confirmButton: { minWidth: 150 }
});
