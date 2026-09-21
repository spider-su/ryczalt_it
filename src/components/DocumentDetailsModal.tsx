import { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAccountingRepository } from '../api/config';
import { Invoice } from '../model/accounting';
import { formatDate, paymentStatusLabel, t } from '../i18n';
import { formatMoney } from '../utils/money';
import { theme } from '../theme/theme';
import { KeyValueRow, ListGroup, PrimaryButton, SheetHeader } from './ui';

export function DocumentDetailsModal({ item, onClose }: { item: Invoice | null; onClose: () => void }) {
  const repository = useMemo(() => createAccountingRepository(), []);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  useEffect(() => { setPaymentStatus(item?.paymentStatus ?? null); setPaymentError(false); }, [item]);
  if (!item) return null;
  const isCost = item.direction === 'PURCHASE';
  const isManuallyPaid = paymentStatus?.toUpperCase() === 'MANUALLY_CONFIRMED';
  const updateManualPayment = () => {
    setPaymentBusy(true); setPaymentError(false);
    const request = isManuallyPaid
      ? repository.clearInvoiceManualPayment(item.id).then(() => setPaymentStatus('UNMATCHED'))
      : repository.markInvoiceManuallyPaid(item.id, localDateToday(), 'Paid manually from mobile app').then(() => setPaymentStatus('MANUALLY_CONFIRMED'));
    void request.catch(() => setPaymentError(true)).finally(() => setPaymentBusy(false));
  };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}><View style={styles.sheet}><SheetHeader title={t('invoices.details')} onClose={onClose} /><Text style={styles.detailTitle}>{item.counterparty ?? item.title}</Text><View style={styles.detailAmount}><Text style={styles.detailAmountValue}>{formatMoney(item.amount)}</Text><Text style={styles.meta}>{item.currency ?? t('common.unknown')}</Text></View><ListGroup><KeyValueRow label={t('invoices.number')} value={item.documentNumber ?? t('common.unknown')} /><KeyValueRow label={t('invoices.issueDate')} value={formatDate(item.issueDate)} /><KeyValueRow label={t('invoices.status')} value={paymentStatus ? paymentStatusLabel(paymentStatus) : t('common.unknown')} /><KeyValueRow label={t('invoices.review')} value={item.approvalStatus ?? t('common.unknown')} /><KeyValueRow label={t('invoices.paymentVerification')} value={item.paymentVerificationPolicy ?? t('common.unknown')} />{item.correctsInvoiceReference || item.correctsInvoiceId ? <KeyValueRow label={t('invoices.correction')} value={String(item.correctsInvoiceReference ?? item.correctsInvoiceId)} /> : null}</ListGroup>{isCost ? <View style={styles.manualPayment}><PrimaryButton label={paymentBusy ? t('common.loading') : isManuallyPaid ? t('invoices.removeManualPaid') : t('invoices.manualPaid')} onPress={updateManualPayment} disabled={paymentBusy} />{paymentError ? <Text style={styles.error}>{t('invoices.manualPaidError')}</Text> : null}</View> : null}</View></SafeAreaView></Modal>;
}

function localDateToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.md },
  detailTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.section, fontWeight: '800', marginBottom: theme.spacing.sm },
  detailAmount: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, paddingVertical: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider, marginBottom: theme.spacing.sm },
  detailAmountValue: { color: theme.colors.textPrimary, fontSize: theme.typography.amount, fontWeight: '800' },
  meta: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting }
  ,manualPayment: { marginTop: theme.spacing.lg, gap: theme.spacing.sm }, error: { color: theme.colors.danger, fontSize: theme.typography.supporting }
});
