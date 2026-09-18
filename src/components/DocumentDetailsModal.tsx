import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AccountingLine } from '../model/accounting';
import { formatDate, paymentStatusLabel, t } from '../i18n';
import { formatMoney } from '../utils/money';
import { theme } from '../theme/theme';
import { documentProcessingView, documentReviewView, ksefStatusView } from '../presentation/accountingStatus';

export function DocumentDetailsModal({ item, onClose }: { item: AccountingLine | null; onClose: () => void }) {
  if (!item) return null;
  const processing = documentProcessingView(item.importStatus); const review = documentReviewView(item.reviewStatus); const ksef = ksefStatusView(item.ksefStatus);
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}><View style={styles.sheet}><View style={styles.header}><Text style={styles.sheetTitle}>{t('invoices.details')}</Text><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10}><Ionicons name="close" size={24} color={theme.colors.textPrimary} /></Pressable></View><Text style={styles.detailTitle}>{item.counterparty ?? item.title}</Text><View style={styles.detailAmount}><Text style={styles.detailAmountValue}>{formatMoney(item.amount)}</Text><Text style={styles.meta}>{item.currency ?? t('common.unknown')}</Text></View><Text style={styles.meta}>{t('invoices.number')}: {item.documentNumber ?? t('common.unknown')}</Text><Text style={styles.meta}>{t('invoices.issueDate')}: {formatDate(item.issueDate)}</Text><Text style={styles.meta}>{t('invoices.status')}: {item.paymentStatus ? paymentStatusLabel(item.paymentStatus) : t('common.unknown')}</Text><Text style={styles.meta}>{t('invoices.source')}: {item.sourceTypeLabel ?? item.source ?? t('common.unknown')}</Text><Text style={styles.meta}>{t('invoices.processing')}: {t(processing.labelKey)}</Text><Text style={styles.meta}>{t('invoices.review')}: {t(review.labelKey)}</Text>{item.ksefStatus ? <Text style={styles.meta}>{t('invoices.ksef')}: {t(ksef.labelKey)}</Text> : null}{item.correctsDocumentReference || item.correctsDocumentId ? <Text style={styles.meta}>{t('invoices.correction')}: {item.correctsDocumentReference ?? item.correctsDocumentId}</Text> : null}</View></SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },
  detailTitle: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: theme.spacing.sm },
  detailAmount: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, paddingVertical: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.borderSubtle, marginBottom: theme.spacing.sm },
  detailAmountValue: { color: theme.colors.textPrimary, fontSize: 30, fontWeight: '800' },
  meta: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 5 }
});
