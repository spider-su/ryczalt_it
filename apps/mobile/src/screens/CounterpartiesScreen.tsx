import * as React from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createAccountingRepository } from '../api/config';
import type { Counterparty, CounterpartyRule, Invoice } from '../model/accounting';
import { useLocale } from '../i18n/LocaleContext';
import { formatDate, paymentVerificationLabel, t } from '../i18n';
import { formatMoneyWithCurrencyCode } from '../utils/money';
import { invoiceApprovalPresentation, invoiceClassificationLabel, invoicePaymentPresentation } from '../presentation/invoiceList';
import { DocumentDetailsModal } from '../components/DocumentDetailsModal';
import { ErrorState, ListGroup, LoadingState, SearchField, SheetHeader } from '../components/ui';
import { createThemeStyles, theme, useTheme } from '../theme/theme';
import { counterpartyInvoiceCount, counterpartyTaxIdentifier, filterCounterparties } from '../presentation/counterpartyList';

export function CounterpartiesScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useTheme();
  useLocale();
  const repository = React.useMemo(() => createAccountingRepository(), []);
  const [items, setItems] = React.useState<Counterparty[]>([]);
  const [selected, setSelected] = React.useState<Counterparty | null>(null);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const listRef = React.useRef<ScrollView>(null);
  const listScrollY = React.useRef(0);
  React.useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true); setError(false);
    repository.getCounterparties().then((value) => active && setItems(value)).catch(() => active && setError(true)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [visible, repository]);
  const filteredItems = filterCounterparties(items, query);
  const closeSheet = () => { setSelected(null); setSelectedInvoice(null); setQuery(''); listScrollY.current = 0; onClose(); };
  React.useEffect(() => {
    if (!selected && visible) requestAnimationFrame(() => listRef.current?.scrollTo({ y: listScrollY.current, animated: false }));
  }, [selected, visible]);
  const detailAccessibilityLabels = { back: t('common.back'), close: t('common.close') };
  return <><Modal visible={visible && !selectedInvoice} transparent animationType="slide" onRequestClose={() => { if (selected) setSelected(null); else closeSheet(); }}><SafeAreaView style={styles.overlay}><View style={styles.sheet}>{selected ? <CounterpartyDetail item={selected} onBack={() => setSelected(null)} onClose={closeSheet} onInvoice={setSelectedInvoice} accessibilityLabels={detailAccessibilityLabels} /> : <><SheetHeader title={t('counterparties.title')} onClose={closeSheet} /><View style={styles.searchWrap}><SearchField value={query} onChangeText={setQuery} placeholder={t('counterparties.searchPlaceholder')} onClear={() => setQuery('')} /></View>{loading ? <LoadingState /> : error ? <ErrorState title={t('counterparties.error')} /> : items.length === 0 ? <Text style={styles.muted}>{t('counterparties.empty')}</Text> : filteredItems.length === 0 ? <Text style={styles.muted}>{t('counterparties.searchEmpty')}</Text> : <ScrollView ref={listRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onScroll={(event) => { listScrollY.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}><ListGroup>{filteredItems.map((item, index) => { const secondary = `${counterpartyTaxIdentifier(item)} · ${counterpartyInvoiceCount(item.invoiceCount)}`; return <Pressable key={item.id} onPress={() => { Keyboard.dismiss(); setSelected(item); }} style={({ pressed }) => [styles.row, index < filteredItems.length - 1 && styles.divider, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${item.displayName}, ${secondary}`} accessibilityHint={t('counterparties.openDetails')}><View style={styles.copy}><Text style={styles.name} numberOfLines={2}>{item.displayName}</Text><Text style={styles.meta}>{secondary}</Text></View><Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} accessibilityElementsHidden importantForAccessibility="no" /></Pressable>; })}</ListGroup></ScrollView>}</>}</View></SafeAreaView></Modal><DocumentDetailsModal item={selectedInvoice} onClose={() => setSelectedInvoice(null)} /></>;
}

function CounterpartyDetail({ item, onBack, onClose, onInvoice, accessibilityLabels }: { item: Counterparty; onBack: () => void; onClose: () => void; onInvoice: (invoice: Invoice) => void; accessibilityLabels: { back: string; close: string } }) {
  const repository = React.useMemo(() => createAccountingRepository(), []);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [rules, setRules] = React.useState<CounterpartyRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  const [rulesLoading, setRulesLoading] = React.useState(true);
  const [rulesError, setRulesError] = React.useState(false);
  const [rulesRetry, setRulesRetry] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setInvoices([]);
    repository.getCounterpartyInvoices(item.id).then((value) => active && setInvoices(value)).catch(() => active && setError(true)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [item.id, repository, retry]);

  React.useEffect(() => {
    let active = true;
    setRulesLoading(true); setRulesError(false); setRules([]);
    repository.getCounterpartyRules(item.id).then((value) => active && setRules(value)).catch(() => active && setRulesError(true)).finally(() => active && setRulesLoading(false));
    return () => { active = false; };
  }, [item.id, repository, rulesRetry]);

  return <View style={styles.detail}><View style={styles.detailHeader}><Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={accessibilityLabels.back} hitSlop={6} style={styles.headerButton}><Ionicons name="chevron-back" size={23} color={theme.colors.textPrimary} /></Pressable><Text style={styles.detailHeaderTitle} numberOfLines={1}>{t('counterparties.detail')}</Text><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={accessibilityLabels.close} hitSlop={6} style={styles.headerButton}><Ionicons name="close" size={22} color={theme.colors.textPrimary} /></Pressable></View><ScrollView contentContainerStyle={styles.detailContent}><Text style={styles.detailName}>{item.displayName}</Text>{item.alias ? <Text style={styles.meta}>{item.legalName}</Text> : null}<Text style={styles.meta}>{item.country || t('common.unknown')}</Text><Text style={styles.meta}>{counterpartyTaxIdentifier(item)}</Text><Text style={styles.section}>{t('counterparties.rules')}</Text>{rulesLoading ? <LoadingState /> : rulesError ? <ErrorState title={t('counterparties.rulesUnavailable')} onRetry={() => setRulesRetry((value) => value + 1)} /> : rules.length === 0 ? <Text style={styles.muted}>{t('counterparties.noRules')}</Text> : <ListGroup>{rules.map((rule, index) => <CounterpartyRuleRow key={rule.id} rule={rule} last={index === rules.length - 1} />)}</ListGroup>}<Text style={styles.section}>{t('counterparties.history')}</Text>{loading ? <LoadingState /> : error ? <ErrorState title={t('counterparties.historyError')} onRetry={() => setRetry((value) => value + 1)} /> : invoices.length === 0 ? <Text style={styles.muted}>{t('counterparties.noInvoices')}</Text> : <ListGroup>{invoices.map((invoice, index) => <InvoiceRow key={`${invoice.id}-${index}`} item={invoice} last={index === invoices.length - 1} onPress={() => onInvoice(invoice)} />)}</ListGroup>}</ScrollView></View>;
}

function CounterpartyRuleRow({ rule, last }: { rule: CounterpartyRule; last: boolean }) {
  const classification = rule.classification ? invoiceClassificationLabel('PURCHASE', rule.classification) ?? rule.classification : null;
  return <View style={[styles.ruleRow, !last && styles.divider]}><View style={styles.copy}><Text style={styles.ruleName}>{rule.name}</Text>{classification ? <Text style={styles.meta}>{t('counterparties.category')}: {classification}</Text> : null}<Text style={styles.meta}>{t('counterparties.autoApprove')}: {rule.autoApprove ? t('counterparties.enabled') : t('counterparties.disabled')}</Text><Text style={styles.meta}>{t('counterparties.paymentVerification')}: {paymentVerificationLabel(rule.paymentVerificationPolicy)}</Text></View></View>;
}

function InvoiceRow({ item, last, onPress }: { item: Invoice; last: boolean; onPress: () => void }) {
  const approval = invoiceApprovalPresentation(item.approvalStatus, item.approvalSource);
  const payment = invoicePaymentPresentation(item.paymentStatus);
  const paymentColor = payment?.tone === 'success' ? theme.colors.success : payment?.tone === 'warning' ? theme.colors.warning : payment?.tone === 'info' ? theme.colors.info : theme.colors.textMuted;
  const approvalColor = approval?.tone === 'success' ? theme.colors.success : approval?.tone === 'warning' ? theme.colors.warning : theme.colors.textMuted;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.documentNumber ?? item.title}, ${formatMoneyWithCurrencyCode(item.amount)}`} style={({ pressed }) => [styles.invoiceRow, !last && styles.divider, pressed && styles.pressed]}><View style={styles.copy}><Text style={styles.invoiceTitle} numberOfLines={1}>{item.documentNumber ?? item.title}</Text><Text style={styles.meta} numberOfLines={1}>{formatDate(item.issueDate, { day: 'numeric', month: 'short' })}</Text></View><View style={styles.invoiceAmount}><Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{formatMoneyWithCurrencyCode(item.amount)}</Text>{approval ? <View style={styles.statusLine}><View style={[styles.statusDot, { backgroundColor: approvalColor }]} /><Text style={[styles.statusText, { color: approvalColor }]} numberOfLines={1}>{t(`invoices.approval.${approval.label}`)}</Text></View> : null}{payment ? <View style={styles.statusLine}><View style={[styles.statusDot, { backgroundColor: paymentColor }]} /><Text style={[styles.statusText, { color: paymentColor }]} numberOfLines={1}>{t(payment.labelKey)}</Text></View> : null}</View></Pressable>;
}

const styles = createThemeStyles({ overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }, sheet: { width: '100%', maxWidth: 640, maxHeight: '90%', alignSelf: 'center', backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xl }, searchWrap: { marginBottom: theme.spacing.md }, content: { paddingBottom: theme.spacing.xxxl }, row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg }, divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider }, pressed: { backgroundColor: theme.colors.surfaceSecondary }, copy: { flex: 1, minWidth: 0 }, name: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: theme.typography.rowTitle }, meta: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, lineHeight: 19, marginTop: theme.spacing.xs, flexShrink: 1 }, muted: { color: theme.colors.textSecondary, fontSize: theme.typography.body, lineHeight: 22, paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.xs }, detail: { maxHeight: '100%', backgroundColor: theme.colors.surface }, detailHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider, marginBottom: theme.spacing.md }, headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, detailHeaderTitle: { flex: 1, color: theme.colors.textPrimary, textAlign: 'center', fontSize: theme.typography.section, fontWeight: '800' }, detailContent: { paddingBottom: theme.spacing.xxxl }, detailName: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: theme.spacing.md, flexShrink: 1 }, section: { color: theme.colors.textPrimary, fontWeight: '700', marginTop: theme.spacing.xl, marginBottom: theme.spacing.xs }, ruleRow: { minHeight: 76, justifyContent: 'center', paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg }, ruleName: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '700' }, invoiceRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg }, invoiceTitle: { color: theme.colors.textPrimary, fontWeight: '700' }, invoiceAmount: { alignItems: 'flex-end', maxWidth: '48%', minWidth: 92 }, amount: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }, statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: theme.spacing.xs, marginTop: theme.spacing.xs, maxWidth: '100%' }, statusText: { fontSize: theme.typography.caption, flexShrink: 1 }, statusDot: { width: 7, height: 7, borderRadius: 4 } });
