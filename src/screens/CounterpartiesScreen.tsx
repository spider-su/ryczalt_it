import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAccountingRepository } from '../api/config';
import type { Counterparty, Invoice } from '../model/accounting';
import { useLocale } from '../i18n/LocaleContext';
import { formatDate, paymentStatusLabel, t } from '../i18n';
import { formatMoneyWithoutCurrency } from '../utils/money';
import { invoiceStatusTone } from '../presentation/accounting';
import { DocumentDetailsModal } from '../components/DocumentDetailsModal';
import { ErrorState, ListGroup, LoadingState, SheetHeader } from '../components/ui';
import { theme } from '../theme/theme';

export function CounterpartiesScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useLocale();
  const repository = React.useMemo(() => createAccountingRepository(), []);
  const [items, setItems] = React.useState<Counterparty[]>([]);
  const [selected, setSelected] = React.useState<Counterparty | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true); setError(false);
    repository.getCounterparties().then((value) => active && setItems(value)).catch(() => active && setError(true)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [visible, repository]);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}><View style={styles.sheet}><SheetHeader title={t('counterparties.title')} onClose={onClose} />{loading ? <LoadingState /> : error ? <ErrorState title={t('counterparties.error')} /> : <ScrollView contentContainerStyle={styles.content}>{items.length === 0 ? <Text style={styles.muted}>{t('counterparties.empty')}</Text> : <ListGroup>{items.map((item, index) => <Pressable key={item.id} onPress={() => setSelected(item)} style={[styles.row, index < items.length - 1 && styles.divider]}><View style={styles.copy}><Text style={styles.name}>{item.displayName}</Text><Text style={styles.meta}>{item.taxIdentifier || t('common.unknown')} · {item.invoiceCount} {t('counterparties.invoices')}</Text></View></Pressable>)}</ListGroup>}</ScrollView>}{selected ? <CounterpartyDetail item={selected} onClose={() => setSelected(null)} /> : null}</View></SafeAreaView></Modal>;
}

function CounterpartyDetail({ item, onClose }: { item: Counterparty; onClose: () => void }) {
  const repository = React.useMemo(() => createAccountingRepository(), []);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [retry, setRetry] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setInvoices([]);
    repository.getCounterpartyInvoices(item.id).then((value) => active && setInvoices(value)).catch(() => active && setError(true)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [item.id, repository, retry]);

  return <><Modal visible transparent animationType="slide" onRequestClose={onClose}><View style={styles.detailOverlay}><View style={styles.detail}><SheetHeader title={t('counterparties.detail')} onClose={onClose} /><ScrollView contentContainerStyle={styles.detailContent}><Text style={styles.detailName}>{item.displayName}</Text>{item.alias ? <Text style={styles.meta}>{item.legalName}</Text> : null}<Text style={styles.meta}>{item.country || t('common.unknown')} · {item.taxIdentifier || t('common.unknown')}</Text><Text style={styles.section}>{t('counterparties.history')}</Text>{loading ? <LoadingState /> : error ? <ErrorState title={t('counterparties.historyError')} onRetry={() => setRetry((value) => value + 1)} /> : invoices.length === 0 ? <Text style={styles.muted}>{t('counterparties.noInvoices')}</Text> : <ListGroup>{invoices.map((invoice, index) => <InvoiceRow key={`${invoice.id}-${index}`} item={invoice} last={index === invoices.length - 1} onPress={() => setSelectedInvoice(invoice)} />)}</ListGroup>}</ScrollView></View></View></Modal><DocumentDetailsModal item={selectedInvoice} onClose={() => setSelectedInvoice(null)} /></>;
}

function InvoiceRow({ item, last, onPress }: { item: Invoice; last: boolean; onPress: () => void }) {
  const tone = invoiceStatusTone(item.paymentStatus);
  const color = tone === 'success' ? theme.colors.success : tone === 'warning' ? theme.colors.warning : theme.colors.textMuted;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.documentNumber ?? item.title}, ${formatMoneyWithoutCurrency(item.amount)}`} style={({ pressed }) => [styles.invoiceRow, !last && styles.divider, pressed && styles.pressed]}><View style={styles.copy}><Text style={styles.invoiceTitle} numberOfLines={1}>{item.documentNumber ?? item.title}</Text><Text style={styles.meta} numberOfLines={1}>{formatDate(item.issueDate)}</Text></View><View style={styles.invoiceAmount}><Text style={styles.amount}>{formatMoneyWithoutCurrency(item.amount)}</Text><View style={styles.statusLine}><View style={[styles.statusDot, { backgroundColor: color }]} /><Text style={[styles.meta, { color }]}>{item.paymentStatus ? paymentStatusLabel(item.paymentStatus) : t('common.unknown')}</Text></View></View></Pressable>;
}

const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }, sheet: { maxHeight: '90%', backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl }, content: { paddingBottom: theme.spacing.xxxl }, row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg }, divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider }, pressed: { backgroundColor: theme.colors.surfaceSecondary }, copy: { flex: 1, minWidth: 0 }, name: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 }, meta: { color: theme.colors.textSecondary, marginTop: theme.spacing.xs }, rules: { color: theme.colors.accent, fontWeight: '700' }, muted: { color: theme.colors.textSecondary, lineHeight: 22, paddingVertical: theme.spacing.lg }, detailOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }, detail: { maxHeight: '94%', backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl }, detailContent: { paddingBottom: theme.spacing.xxxl }, detailName: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: theme.spacing.lg }, section: { color: theme.colors.textPrimary, fontWeight: '700', marginTop: theme.spacing.xl, marginBottom: theme.spacing.xs }, invoiceRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg }, invoiceTitle: { color: theme.colors.textPrimary, fontWeight: '700' }, invoiceAmount: { alignItems: 'flex-end', maxWidth: '45%' }, amount: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700' }, statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: theme.spacing.xs, marginTop: theme.spacing.xs }, statusDot: { width: 7, height: 7, borderRadius: 4 }
});
