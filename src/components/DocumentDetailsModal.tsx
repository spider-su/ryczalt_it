import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Invoice } from '../model/accounting';
import { formatDate, paymentStatusLabel, t } from '../i18n';
import { formatMoney } from '../utils/money';
import { theme } from '../theme/theme';
import { documentProcessingView } from '../presentation/accountingStatus';
import { KeyValueRow, ListGroup, SheetHeader } from './ui';

export function DocumentDetailsModal({ item, onClose }: { item: Invoice | null; onClose: () => void }) {
  if (!item) return null;
  const processing = documentProcessingView(item.importStatus);
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}><View style={styles.sheet}><SheetHeader title={t('invoices.details')} onClose={onClose} /><Text style={styles.detailTitle}>{item.counterparty ?? item.title}</Text><View style={styles.detailAmount}><Text style={styles.detailAmountValue}>{formatMoney(item.amount)}</Text><Text style={styles.meta}>{item.currency ?? t('common.unknown')}</Text></View><ListGroup><KeyValueRow label={t('invoices.number')} value={item.documentNumber ?? t('common.unknown')} /><KeyValueRow label={t('invoices.issueDate')} value={formatDate(item.issueDate)} /><KeyValueRow label={t('invoices.status')} value={item.paymentStatus ? paymentStatusLabel(item.paymentStatus) : t('common.unknown')} /><KeyValueRow label={t('invoices.source')} value={item.sourceType ?? item.source ?? t('common.unknown')} /><KeyValueRow label={t('invoices.processing')} value={t(processing.labelKey)} /><KeyValueRow label={t('invoices.review')} value={item.approvalStatus ?? t('common.unknown')} /><KeyValueRow label={t('invoices.paymentVerification')} value={item.paymentVerificationPolicy ?? t('common.unknown')} />{item.correctsInvoiceReference || item.correctsInvoiceId ? <KeyValueRow label={t('invoices.correction')} value={String(item.correctsInvoiceReference ?? item.correctsInvoiceId)} /> : null}</ListGroup></View></SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.md },
  detailTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.section, fontWeight: '800', marginBottom: theme.spacing.sm },
  detailAmount: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, paddingVertical: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider, marginBottom: theme.spacing.sm },
  detailAmountValue: { color: theme.colors.textPrimary, fontSize: theme.typography.amount, fontWeight: '800' },
  meta: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting }
});
