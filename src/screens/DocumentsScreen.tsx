import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAccountingRepository } from '../api/config';
import { Invoice } from '../model/accounting';
import { formatDate, formatMonth, t } from '../i18n';
import { formatMoneyWithoutCurrency } from '../utils/money';
import { dateMatches, matchesInvoice, paymentMatches, type DocumentDateRange } from '../presentation/accounting';
import { theme } from '../theme/theme';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { MonthSelector } from '../components/MonthSelector';
import { useLocale } from '../i18n/LocaleContext';
import { EmptyState, ErrorState, ListGroup, LoadingState, PageHeader, SearchField, SegmentedControl, SelectionList, SheetHeader } from '../components/ui';
import { DocumentDetailsModal } from '../components/DocumentDetailsModal';
import { groupInvoicesByMonth, invoiceApprovalPresentation, invoiceSourcePresentation, type InvoiceMonthGroup } from '../presentation/invoiceList';

type Filters = { direction: 'ALL' | 'SALE' | 'PURCHASE'; currency: string; payment: 'ALL' | 'PAID' | 'UNPAID' | 'OVERDUE'; date: DocumentDateRange };
const initialFilters: Filters = { direction: 'ALL', currency: 'ALL', payment: 'ALL', date: 'SELECTED_MONTH' };

export function DocumentsScreen() {
  useLocale();
  const repository = useMemo(() => createAccountingRepository(), []);
  const { month, refreshVersion } = useAccountingMonth();
  const [items, setItems] = useState<Invoice[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setItems([]);
    const count = filters.date === 'LAST_3_MONTHS' ? 3 : filters.date === 'PREVIOUS_MONTH' ? 2 : 1;
    repository.getInvoicesForRange(month, count).then((value) => active && setItems(value)).catch(() => active && setError(true)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [repository, month, filters.date, refreshVersion]);

  const currencies = [...new Set(items.map((item) => item.currency).filter(Boolean) as string[])];
  const filtered = items.filter((item) => filters.direction === 'ALL' || item.direction === filters.direction).filter((item) => filters.currency === 'ALL' || item.currency === filters.currency).filter((item) => matchesInvoice(item, query)).filter((item) => paymentMatches(item, filters.payment)).filter((item) => dateMatches(item, filters.date, month));
  const groups = groupInvoicesByMonth(filtered);
  const hasFilters = query.trim().length > 0 || JSON.stringify(filters) !== JSON.stringify(initialFilters);
  const clear = () => { setQuery(''); setFilters(initialFilters); };
  const directionOptions = [{ value: 'ALL' as const, label: t('common.all') }, { value: 'SALE' as const, label: t('common.sales') }, { value: 'PURCHASE' as const, label: t('common.purchases') }];

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <PageHeader title={t('invoices.title')} />
    <MonthSelector loading={loading} />
    <View style={styles.searchWrap}><SearchField value={query} onChangeText={setQuery} placeholder={t('invoices.search')} onFilter={() => setSheet(true)} filterActive={hasFilters} /></View>
    <View style={styles.direction}><SegmentedControl options={directionOptions} selected={filters.direction} onSelect={(direction) => setFilters({ ...filters, direction })} /></View>
    {loading ? <LoadingState /> : error ? <ErrorState /> : groups.length === 0 ? <Empty filtered={hasFilters} onClear={clear} /> : <View style={styles.groups}>{groups.map((group) => <InvoiceMonth key={group.month} group={group} onSelect={setSelected} />)}</View>}
  </ScrollView><FilterSheet visible={sheet} filters={filters} currencies={currencies} onChange={setFilters} onClose={() => setSheet(false)} /><DocumentDetailsModal item={selected} onClose={() => setSelected(null)} /></SafeAreaView>;
}

function InvoiceMonth({ group, onSelect }: { group: InvoiceMonthGroup; onSelect: (item: Invoice) => void }) {
  return <View style={styles.monthGroup}><Text style={styles.monthTitle}>{formatMonth(group.month)}</Text><ListGroup>{group.invoices.map((item, index) => <DocumentRow key={`${item.id}-${index}`} item={item} last={index === group.invoices.length - 1} onPress={() => onSelect(item)} />)}</ListGroup></View>;
}

function DocumentRow({ item, last, onPress }: { item: Invoice; last: boolean; onPress: () => void }) {
  const approval = invoiceApprovalPresentation(item.approvalStatus, item.approvalSource);
  const approvalColor = approval?.tone === 'success' ? theme.colors.success : approval?.tone === 'warning' ? theme.colors.warning : theme.colors.textMuted;
  const source = invoiceSourcePresentation(item);
  const sourceColor = source.kind === 'ksef' ? theme.colors.success : theme.colors.textSecondary;
  const name = item.alias || item.legalName || item.counterparty || item.title;
  const identity = source.kind === 'ksef'
    ? [t('invoices.ksef'), source.reference].filter(Boolean).join(' · ')
    : [source.reference, source.date ? formatDate(source.date) : null].filter(Boolean).join(' · ') || t('common.unknown');
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, ${identity}, ${formatMoneyWithoutCurrency(item.amount)}`} style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}>
    <Text style={styles.rowTitle} numberOfLines={2}>{name}</Text>
    <View style={styles.sourceLine}><Ionicons name={source.kind === 'ksef' ? 'shield-checkmark-outline' : 'document-text-outline'} size={16} color={sourceColor} accessibilityElementsHidden importantForAccessibility="no" /><Text style={styles.sourceText} numberOfLines={1}>{identity}</Text></View>
    <View style={styles.footer}>
      {approval ? <View style={[styles.badge, { backgroundColor: approval.tone === 'success' ? theme.colors.successSoft : approval.tone === 'warning' ? theme.colors.warningSoft : theme.colors.surfaceSecondary }]}><Text style={[styles.badgeText, { color: approvalColor }]} numberOfLines={2}>{approval.automatic ? <Ionicons name="sparkles-outline" size={12} color={approvalColor} /> : null}{approval.automatic ? ' ' : ''}{t(`invoices.approval.${approval.label}`)}</Text></View> : <View style={styles.badgePlaceholder} />}
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{formatMoneyWithoutCurrency(item.amount)}</Text>
    </View>
  </Pressable>;
}

function Empty({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return <View style={styles.empty}><EmptyState icon="documents-outline" title={filtered ? t('invoices.filteredTitle') : t('invoices.emptyTitle')} body={filtered ? t('invoices.filteredBody') : t('invoices.emptyBody')} />{filtered ? <Pressable onPress={onClear} style={styles.clearButton} accessibilityRole="button"><Text style={styles.link}>{t('invoices.clearFilters')}</Text></Pressable> : null}</View>;
}

function FilterSheet({ visible, filters, currencies, onChange, onClose }: { visible: boolean; filters: Filters; currencies: string[]; onChange: (value: Filters) => void; onClose: () => void }) {
  const set = (value: Partial<Filters>) => onChange({ ...filters, ...value });
  const dateOptions = [{ value: 'SELECTED_MONTH' as const, label: t('invoices.selectedMonth') }, { value: 'PREVIOUS_MONTH' as const, label: t('common.previousMonth') }, { value: 'LAST_3_MONTHS' as const, label: t('common.last3Months') }];
  const paymentOptions = [{ value: 'ALL' as const, label: t('common.all') }, { value: 'PAID' as const, label: t('common.paid') }, { value: 'UNPAID' as const, label: t('common.unpaid') }, { value: 'OVERDUE' as const, label: t('common.overdue') }];
  const currencyOptions = ['ALL', ...currencies].map((value) => ({ value, label: value === 'ALL' ? t('common.all') : value }));
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={styles.sheet}><SheetHeader title={t('common.filters')} onClose={onClose} /><Text style={styles.filterTitle}>{t('invoices.issueDate')}</Text><SelectionList options={dateOptions} selected={filters.date} onSelect={(date) => set({ date })} /><Text style={styles.filterTitle}>{t('invoices.currency')}</Text><SelectionList options={currencyOptions} selected={filters.currency} onSelect={(currency) => set({ currency })} /><Text style={styles.filterTitle}>{t('invoices.status')}</Text><SelectionList options={paymentOptions} selected={filters.payment} onSelect={(payment) => set({ payment })} /><Pressable style={styles.apply} onPress={onClose} accessibilityRole="button"><Text style={styles.applyText}>{t('common.close')}</Text></Pressable></View></View></Modal>;
}

const styles = StyleSheet.create({
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
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  badge: { minHeight: 24, maxWidth: '68%', flexDirection: 'row', alignItems: 'center', borderRadius: theme.radius.control, paddingHorizontal: theme.spacing.sm, paddingVertical: 3 },
  badgeText: { flexShrink: 1, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  badgePlaceholder: { flex: 1 },
  amount: { flexShrink: 1, color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'right' },
  empty: { marginTop: theme.spacing.xxl },
  clearButton: { alignItems: 'center', marginTop: -theme.spacing.lg, minHeight: 44, justifyContent: 'center' },
  link: { color: theme.colors.accent, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.md },
  filterTitle: { color: theme.colors.textPrimary, fontWeight: '700', marginTop: theme.spacing.sm },
  apply: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.control, backgroundColor: theme.colors.accent, marginTop: theme.spacing.md },
  applyText: { color: theme.colors.onAccent, fontSize: theme.typography.button, fontWeight: '700' }
});
