import { useEffect, useMemo, useState } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAccountingRepository } from '../api/config';
import { Invoice } from '../model/accounting';
import { formatDate, formatMonth, invoiceSourceLabel, t } from '../i18n';
import { formatMoneyWithCurrencyCode } from '../utils/money';
import { dateMatches, matchesInvoice, invoicePaymentMatches, type DocumentDateRange, type InvoicePaymentFilter } from '../presentation/accounting';
import { createThemeStyles, theme, useTheme } from '../theme/theme';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { MonthSelector } from '../components/MonthSelector';
import { useLocale } from '../i18n/LocaleContext';
import { EmptyState, ErrorState, ListGroup, LoadingState, PageHeader, SearchField, SegmentedControl, SelectionList, SheetHeader } from '../components/ui';
import { DocumentDetailsModal } from '../components/DocumentDetailsModal';
import { groupInvoicesByMonth, invoiceApprovalMatches, invoiceApprovalPresentation, invoiceClassificationLabel, invoicePaymentPresentation, invoiceSourceMatches, invoiceSourcePresentation, type InvoiceApprovalFilter, type InvoiceMonthGroup, type InvoiceSourceFilter } from '../presentation/invoiceList';
import type { AppTabParamList } from '../navigation/AppNavigator';

type Filters = { direction: 'ALL' | 'SALE' | 'PURCHASE'; currency: string; payment: InvoicePaymentFilter; approval: InvoiceApprovalFilter; source: InvoiceSourceFilter; classification: string; date: DocumentDateRange };
const initialFilters: Filters = { direction: 'ALL', currency: 'ALL', payment: 'ALL', approval: 'ALL', source: 'ALL', classification: 'ALL', date: 'SELECTED_MONTH' };

type Props = BottomTabScreenProps<AppTabParamList, 'Documents'>;
export function DocumentsScreen({ route, navigation }: Props) {
  useTheme();
  useLocale();
  const repository = useMemo(() => createAccountingRepository(), []);
  const { month, refreshVersion } = useAccountingMonth();
  const [items, setItems] = useState<Invoice[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);

  useEffect(() => {
    const direction = route.params?.direction;
    if (!direction) return;
    setFilters({ ...initialFilters, direction });
    navigation.setParams({ direction: undefined });
  }, [route.params?.direction, navigation]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setItems([]);
    const count = filters.date === 'LAST_3_MONTHS' ? 3 : filters.date === 'PREVIOUS_MONTH' ? 2 : 1;
    repository.getInvoicesForRange(month, count).then((value) => active && setItems(value)).catch(() => active && setError(true)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [repository, month, filters.date, refreshVersion]);

  const currencies = [...new Set(items.map((item) => item.currency).filter(Boolean) as string[])];
  const classifications = [...new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value)))];
  const filtered = items.filter((item) => filters.direction === 'ALL' || item.direction === filters.direction).filter((item) => filters.currency === 'ALL' || item.currency === filters.currency).filter((item) => matchesInvoice(item, query)).filter((item) => invoicePaymentMatches(item, filters.payment)).filter((item) => invoiceApprovalMatches(item, filters.approval)).filter((item) => invoiceSourceMatches(item, filters.source)).filter((item) => filters.classification === 'ALL' || item.category === filters.classification).filter((item) => dateMatches(item, filters.date, month));
  const groups = groupInvoicesByMonth(filtered);
  const hasOptionalFilters = filters.currency !== 'ALL' || filters.payment !== 'ALL' || filters.approval !== 'ALL' || filters.source !== 'ALL' || filters.classification !== 'ALL' || filters.date !== 'SELECTED_MONTH';
  const hasFilters = query.trim().length > 0 || filters.direction !== 'ALL' || hasOptionalFilters;
  const clear = () => { setQuery(''); setFilters((current) => ({ ...initialFilters, direction: current.direction })); };
  const openFilterSheet = () => { setDraftFilters(filters); setSheet(true); };
  const directionOptions = [{ value: 'ALL' as const, label: t('common.all') }, { value: 'SALE' as const, label: t('common.sales') }, { value: 'PURCHASE' as const, label: t('common.purchases') }];

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <PageHeader title={t('invoices.title')} />
    <MonthSelector loading={loading} />
    <View style={styles.searchWrap}><SearchField value={query} onChangeText={setQuery} placeholder={t('invoices.search')} onFilter={openFilterSheet} filterActive={hasOptionalFilters} /></View>
    <View style={styles.direction}><SegmentedControl options={directionOptions} selected={filters.direction} onSelect={(direction) => setFilters({ ...filters, direction })} /></View>
    {loading ? <LoadingState /> : error ? <ErrorState /> : groups.length === 0 ? <Empty filtered={hasFilters} onClear={clear} /> : <View style={styles.groups}>{groups.map((group) => <InvoiceMonth key={group.month} group={group} onSelect={setSelected} />)}</View>}
  </ScrollView><FilterSheet visible={sheet} filters={draftFilters} currencies={currencies} classifications={classifications} onChange={setDraftFilters} onReset={() => setDraftFilters((current) => ({ ...initialFilters, direction: current.direction }))} onApply={() => { setFilters(draftFilters); setSheet(false); }} onClose={() => setSheet(false)} /><DocumentDetailsModal item={selected} onClose={() => setSelected(null)} /></SafeAreaView>;
}

function InvoiceMonth({ group, onSelect }: { group: InvoiceMonthGroup; onSelect: (item: Invoice) => void }) {
  return <View style={styles.monthGroup}><Text style={styles.monthTitle}>{formatMonth(group.month)}</Text><ListGroup>{group.invoices.map((item, index) => <DocumentRow key={`${item.id}-${index}`} item={item} last={index === group.invoices.length - 1} onPress={() => onSelect(item)} />)}</ListGroup></View>;
}

function DocumentRow({ item, last, onPress }: { item: Invoice; last: boolean; onPress: () => void }) {
  const approval = invoiceApprovalPresentation(item.approvalStatus, item.approvalSource);
  const approvalColor = approval?.tone === 'success' ? theme.colors.success : approval?.tone === 'warning' ? theme.colors.warning : theme.colors.textMuted;
  const source = invoiceSourcePresentation(item);
  const classification = invoiceClassificationLabel(item.direction, item.category);
  const sourceColor = source.kind === 'ksef' ? theme.colors.success : theme.colors.textSecondary;
  const name = item.alias || item.legalName || item.counterparty || item.title;
  const identity = [item.documentNumber || source.reference, item.issueDate ? formatDate(item.issueDate) : null].filter(Boolean).join(' · ') || t('common.unknown');
  const sourceLabel = invoiceSourceLabel(item.sourceType, item.source);
  const payment = invoicePaymentPresentation(item.paymentStatus);
  const paymentText = payment ? t(payment.labelKey) : null;
  const paymentTone = payment?.tone ?? 'muted';
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={[name, identity, classification, approval ? t(`invoices.approval.${approval.label}`) : null, paymentText, formatMoneyWithCurrencyCode(item.amount), sourceLabel].filter(Boolean).join(', ')} style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}>
    <Text style={styles.rowTitle} numberOfLines={2}>{name}</Text>
    <View style={styles.sourceLine}><Ionicons name={source.kind === 'ksef' ? 'shield-checkmark-outline' : 'document-text-outline'} size={16} color={sourceColor} accessibilityElementsHidden importantForAccessibility="no" /><Text style={styles.sourceText} numberOfLines={1}>{identity}</Text></View>
    {classification ? <Text style={styles.classification} numberOfLines={1}>{classification}</Text> : null}
    <View style={styles.footer}>
      <View style={styles.badges}>{approval ? <View style={[styles.badge, { backgroundColor: approval.tone === 'success' ? theme.colors.successSoft : approval.tone === 'warning' ? theme.colors.warningSoft : theme.colors.surfaceSecondary }]}><Text style={[styles.badgeText, { color: approvalColor }]} numberOfLines={1}>{approval.automatic ? <Ionicons name="sparkles-outline" size={12} color={approvalColor} /> : null}{approval.automatic ? ' ' : ''}{t(`invoices.approval.${approval.label}`)}</Text></View> : null}{paymentText ? <View style={[styles.badge, { backgroundColor: paymentTone === 'success' ? theme.colors.successSoft : paymentTone === 'warning' ? theme.colors.warningSoft : paymentTone === 'info' ? theme.colors.infoSoft : theme.colors.surfaceSecondary }]}><Text style={[styles.badgeText, { color: paymentTone === 'success' ? theme.colors.success : paymentTone === 'warning' ? theme.colors.warning : paymentTone === 'info' ? theme.colors.info : theme.colors.textMuted }]} numberOfLines={1}>{paymentText}</Text></View> : null}</View>
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{formatMoneyWithCurrencyCode(item.amount)}</Text>
    </View>
  </Pressable>;
}

function Empty({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return <View style={styles.empty}><EmptyState icon="documents-outline" title={filtered ? t('invoices.filteredTitle') : t('invoices.emptyTitle')} body={filtered ? t('invoices.filteredBody') : t('invoices.emptyBody')} />{filtered ? <Pressable onPress={onClear} style={styles.clearButton} accessibilityRole="button"><Text style={styles.link}>{t('invoices.clearFilters')}</Text></Pressable> : null}</View>;
}

function FilterSheet({ visible, filters, currencies, classifications, onChange, onReset, onApply, onClose }: { visible: boolean; filters: Filters; currencies: string[]; classifications: string[]; onChange: (value: Filters) => void; onReset: () => void; onApply: () => void; onClose: () => void }) {
  const set = (value: Partial<Filters>) => onChange({ ...filters, ...value });
  const dateOptions = [{ value: 'SELECTED_MONTH' as const, label: t('invoices.selectedMonth') }, { value: 'PREVIOUS_MONTH' as const, label: t('common.previousMonth') }, { value: 'LAST_3_MONTHS' as const, label: t('common.last3Months') }];
  const paymentOptions = [{ value: 'ALL' as const, label: t('common.all') }, { value: 'UNPAID' as const, label: t('common.unpaid') }, { value: 'PARTIALLY_PAID' as const, label: t('common.partial') }, { value: 'PAID' as const, label: t('common.paid') }, { value: 'NOT_REQUIRED' as const, label: t('invoices.paymentNotRequiredShort') }];
  const approvalOptions = [{ value: 'ALL' as const, label: t('common.all') }, { value: 'NEEDS_REVIEW' as const, label: t('invoices.approval.needsReview') }, { value: 'APPROVED' as const, label: t('invoices.approval.approved') }];
  const sourceOptions = [{ value: 'ALL' as const, label: t('common.all') }, { value: 'KSEF' as const, label: t('invoices.sourceKsef') }, { value: 'UPLOAD' as const, label: t('invoices.sourceUpload') }];
  const currencyOptions = ['ALL', ...currencies].map((value) => ({ value, label: value === 'ALL' ? t('common.all') : value }));
  const classificationOptions = [{ value: 'ALL', label: t('common.all') }, ...classifications.map((value) => ({ value, label: invoiceClassificationLabel(filters.direction === 'ALL' ? 'UNKNOWN' : filters.direction, value) ?? t('common.unknown') }))];
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={styles.sheet}><SheetHeader title={t('invoices.filterTitle')} onClose={onClose} /><ScrollView style={styles.filterScroll} keyboardShouldPersistTaps="handled">
    <Text style={styles.filterTitle}>{t('invoices.reviewFilter')}</Text><SelectionList options={approvalOptions} selected={filters.approval} onSelect={(approval) => set({ approval })} />
    <Text style={styles.filterTitle}>{t('invoices.status')}</Text><SelectionList options={paymentOptions} selected={filters.payment} onSelect={(payment) => set({ payment })} />
    <Text style={styles.filterTitle}>{t('invoices.source')}</Text><SelectionList options={sourceOptions} selected={filters.source} onSelect={(source) => set({ source })} />
    {classifications.length ? <><Text style={styles.filterTitle}>{t('invoices.classificationTitle')}</Text><SelectionList options={classificationOptions} selected={filters.classification} onSelect={(classification) => set({ classification })} /></> : null}
    <Text style={styles.filterTitle}>{t('invoices.issueDate')}</Text><SelectionList options={dateOptions} selected={filters.date} onSelect={(date) => set({ date })} />
    <Text style={styles.filterTitle}>{t('invoices.currency')}</Text><SelectionList options={currencyOptions} selected={filters.currency} onSelect={(currency) => set({ currency })} />
  </ScrollView><View style={styles.filterActions}><Pressable style={styles.reset} onPress={onReset} accessibilityRole="button"><Text style={styles.resetText}>{t('common.reset')}</Text></Pressable><Pressable style={styles.apply} onPress={onApply} accessibilityRole="button"><Text style={styles.applyText}>{t('common.apply')}</Text></Pressable></View></View></View></Modal>;
}

const styles = createThemeStyles({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  searchWrap: { marginTop: theme.spacing.xl },
  direction: { marginTop: theme.spacing.md },
  groups: { marginTop: theme.spacing.xxl, gap: theme.spacing.xl },
  monthGroup: { gap: theme.spacing.sm },
  monthTitle: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginLeft: theme.spacing.xs },
  row: { paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.lg, gap: theme.spacing.xs },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  pressed: { backgroundColor: theme.colors.surfaceSecondary },
  rowTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, lineHeight: 22, fontWeight: '700' },
  sourceLine: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minWidth: 0, marginTop: theme.spacing.xs },
  sourceText: { flex: 1, minWidth: 0, color: theme.colors.textSecondary, fontSize: theme.typography.supporting },
  classification: { color: theme.colors.textSecondary, fontSize: theme.typography.caption, marginTop: 2, marginLeft: 24 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  badges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.xs },
  badge: { minHeight: 24, maxWidth: '68%', flexDirection: 'row', alignItems: 'center', borderRadius: theme.radius.control, paddingHorizontal: theme.spacing.sm, paddingVertical: 3 },
  badgeText: { flexShrink: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  amount: { flexShrink: 1, color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'right' },
  empty: { marginTop: theme.spacing.xxl },
  clearButton: { alignItems: 'center', marginTop: -theme.spacing.lg, minHeight: 44, justifyContent: 'center' },
  link: { color: theme.colors.accent, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { maxHeight: '90%', backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
  filterScroll: { flexShrink: 1 },
  filterActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  reset: { minHeight: 48, minWidth: 100, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.control, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  resetText: { color: theme.colors.textPrimary, fontWeight: '700' },
  filterTitle: { color: theme.colors.textPrimary, fontWeight: '700', marginTop: theme.spacing.sm },
  apply: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.control, backgroundColor: theme.colors.accent },
  applyText: { color: theme.colors.onAccent, fontSize: theme.typography.button, fontWeight: '700' }
});
