import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAccountingRepository } from '../api/config';
import { Invoice } from '../model/accounting';
import { formatDate, formatMonth, paymentStatusLabel, t } from '../i18n';
import { formatMoney } from '../utils/money';
import { dateMatches, matchesInvoice, paymentMatches, type DocumentDateRange } from '../presentation/accounting';
import { theme } from '../theme/theme';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { MonthSelector } from '../components/MonthSelector';
import { useLocale } from '../i18n/LocaleContext';
import { EmptyState, ErrorState, ListGroup, LoadingState, PageHeader, SearchField, Section, SegmentedControl, SelectionList, SheetHeader } from '../components/ui';
import { DocumentDetailsModal } from '../components/DocumentDetailsModal';

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
  const hasFilters = query.trim().length > 0 || JSON.stringify(filters) !== JSON.stringify(initialFilters);
  const clear = () => { setQuery(''); setFilters(initialFilters); };
  const directionOptions = [{ value: 'ALL' as const, label: t('common.all') }, { value: 'SALE' as const, label: t('common.sales') }, { value: 'PURCHASE' as const, label: t('common.purchases') }];

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <PageHeader title={t('invoices.title')} />
    <MonthSelector loading={loading} />
    <View style={styles.searchWrap}><SearchField value={query} onChangeText={setQuery} placeholder={t('invoices.search')} onFilter={() => setSheet(true)} filterActive={hasFilters} /></View>
    <View style={styles.direction}><SegmentedControl options={directionOptions} selected={filters.direction} onSelect={(direction) => setFilters({ ...filters, direction })} /></View>
    {loading ? <LoadingState /> : error ? <ErrorState /> : filtered.length === 0 ? <Empty filtered={hasFilters} onClear={clear} /> : <Section title={filters.date === 'LAST_3_MONTHS' ? t('invoices.last3MonthsHeading') : filters.date === 'PREVIOUS_MONTH' ? t('invoices.previousMonthHeading') : formatMonth(month)}><ListGroup>{filtered.map((item, index) => <DocumentRow key={`${item.id}-${index}`} item={item} last={index === filtered.length - 1} onPress={() => setSelected(item)} />)}</ListGroup></Section>}
  </ScrollView><FilterSheet visible={sheet} filters={filters} currencies={currencies} onChange={setFilters} onClose={() => setSheet(false)} /><DocumentDetailsModal item={selected} onClose={() => setSelected(null)} /></SafeAreaView>;
}

function DocumentRow({ item, last, onPress }: { item: Invoice; last: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.counterparty ?? item.title}, ${formatMoney(item.amount)}`} style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}><View style={styles.copy}><Text style={styles.rowTitle} numberOfLines={1}>{item.counterparty ?? item.title}</Text><Text style={styles.meta} numberOfLines={1}>{item.documentNumber ?? t('common.unknown')} · {formatDate(item.issueDate)}</Text></View><View style={styles.right}><Text style={styles.amount}>{formatMoney(item.amount)}</Text>{item.paymentStatus ? <Text style={styles.meta}>{paymentStatusLabel(item.paymentStatus)}</Text> : null}</View></Pressable>;
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
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  pressed: { backgroundColor: theme.colors.surfaceSecondary },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '600' },
  meta: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, marginTop: theme.spacing.xs },
  right: { alignItems: 'flex-end', maxWidth: '42%' },
  amount: { color: theme.colors.textPrimary, fontSize: theme.typography.body, fontWeight: '700' },
  empty: { marginTop: theme.spacing.xxl },
  clearButton: { alignItems: 'center', marginTop: -theme.spacing.lg, minHeight: 44, justifyContent: 'center' },
  link: { color: theme.colors.accent, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.md },
  filterTitle: { color: theme.colors.textPrimary, fontWeight: '700', marginTop: theme.spacing.sm },
  apply: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.control, backgroundColor: theme.colors.accent, marginTop: theme.spacing.md },
  applyText: { color: theme.colors.onAccent, fontSize: theme.typography.button, fontWeight: '700' }
});
