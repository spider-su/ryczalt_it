import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AccountingLine } from '../model/accounting';
import { createAccountingRepository, DEFAULT_ACCOUNTING_MONTH } from '../api/config';
import { formatMoney } from '../utils/money';
import { theme } from '../theme/theme';
import { ApiError, ConfigurationError } from '../api/client';

function errorMessage(error: unknown) {
  if (error instanceof ConfigurationError) return 'Accounting API configuration is invalid';
  if (error instanceof ApiError) return error.message;
  return 'Documents could not be loaded';
}

type Kind = 'ALL' | 'INCOME' | 'COSTS';
type Review = 'ALL' | 'REVIEW' | 'CLEAR';

export function DocumentsScreen() {
  const repository = useMemo(() => createAccountingRepository(), []);
  const [month, setMonth] = useState(DEFAULT_ACCOUNTING_MONTH);
  const [documents, setDocuments] = useState<{ income: AccountingLine[]; costs: AccountingLine[] }>({ income: [], costs: [] });
  const [kind, setKind] = useState<Kind>('ALL');
  const [review, setReview] = useState<Review>('ALL');
  const [category, setCategory] = useState('ALL');
  const [selected, setSelected] = useState<AccountingLine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    repository.getMonth(month).then((value) => {
      if (active) setDocuments({ income: value.income, costs: value.costs });
    }).catch((reason: unknown) => {
      if (active) setError(errorMessage(reason));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month, repository]);

  const all = [...documents.income, ...documents.costs];
  const categories = [...new Set(all.map((item) => item.categoryLabel).filter(Boolean) as string[])].sort();
  const visible = (kind === 'INCOME' ? documents.income : kind === 'COSTS' ? documents.costs : all)
    .filter((item) => review === 'ALL' || (review === 'REVIEW' ? Boolean(item.reviewStatus) : !item.reviewStatus))
    .filter((item) => category === 'ALL' || item.categoryLabel === category);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text style={styles.title}>Documents</Text><Text style={styles.month}>{month}</Text></View>
        <View style={styles.monthRow}>
          <Pressable onPress={() => setMonth(shiftMonth(month, -1))} accessibilityLabel="Previous month"><Ionicons name="chevron-back" size={20} color={theme.colors.text} /></Pressable>
          <Text style={styles.monthLabel}>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T00:00:00`))}</Text>
          <Pressable onPress={() => setMonth(shiftMonth(month, 1))} accessibilityLabel="Next month"><Ionicons name="chevron-forward" size={20} color={theme.colors.text} /></Pressable>
        </View>
        <FilterRow label="Type" values={['ALL', 'INCOME', 'COSTS']} selected={kind} onSelect={(value) => setKind(value as Kind)} />
        <FilterRow label="Review" values={['ALL', 'REVIEW', 'CLEAR']} selected={review} onSelect={(value) => setReview(value as Review)} />
        {categories.length > 0 ? <FilterRow label="Category" values={['ALL', ...categories]} selected={category} onSelect={setCategory} /> : null}
        {loading ? <ActivityIndicator style={styles.loader} color={theme.colors.primary} /> : error ? <Text style={styles.error}>{error}</Text> : visible.length === 0 ? <Text style={styles.empty}>No documents match these filters.</Text> : <View style={styles.card}>{visible.map((item, index) => <DocumentRow key={item.id} item={item} last={index === visible.length - 1} onPress={() => setSelected(item)} />)}</View>}
      </ScrollView>
      <DocumentDetails document={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}

function FilterRow({ label, values, selected, onSelect }: { label: string; values: string[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={styles.filterRow}><Text style={styles.filterLabel}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{values.map((value) => <Pressable key={value} onPress={() => onSelect(value)} style={[styles.chip, selected === value && styles.chipSelected]}><Text style={[styles.chipText, selected === value && styles.chipTextSelected]}>{value === 'ALL' ? 'All' : value === 'INCOME' ? 'Income' : value === 'COSTS' ? 'Costs' : value === 'REVIEW' ? 'Needs review' : value === 'CLEAR' ? 'Reviewed' : value}</Text></Pressable>)}</ScrollView></View>;
}

function DocumentRow({ item, last, onPress }: { item: AccountingLine; last: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.row, !last && styles.divider]}><View style={[styles.icon, item.state === 'attention' && styles.iconWarning]}><Ionicons name="document-text-outline" size={20} color={item.state === 'attention' ? theme.colors.warning : theme.colors.primary} /></View><View style={styles.copy}><Text style={styles.rowTitle}>{item.title}</Text>{item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}</View><Text style={styles.amount}>{formatMoney(item.amount)}</Text><Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} /></Pressable>;
}

function DocumentDetails({ document, onClose }: { document: AccountingLine | null; onClose: () => void }) {
  if (!document) return null;
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={styles.sheet}><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Document details</Text><Pressable onPress={onClose} accessibilityLabel="Close"><Ionicons name="close" size={24} color={theme.colors.text} /></Pressable></View><Text style={styles.detailTitle}>{document.title}</Text><Detail label="Amount" value={formatMoney(document.amount)} /><Detail label="Document" value={document.subtitle ?? 'Not provided'} /><Detail label="Source" value={document.sourceLabel ?? 'Unknown'} /><Detail label="Category" value={document.categoryLabel ?? 'Not applicable'} /><Detail label="Review status" value={document.reviewStatus ?? 'Unknown'} /><Detail label="Evidence filename" value={document.source ?? 'Not provided'} /><Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>Close</Text></Pressable></View></View></Modal>;
}
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }
function shiftMonth(month: string, offset: number) { const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + offset); return date.toISOString().slice(0, 7); }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background }, content: { padding: theme.spacing.lg, paddingBottom: 32 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginVertical: 12 }, title: { fontSize: 32, fontWeight: '900', color: theme.colors.text }, month: { color: theme.colors.textMuted, fontWeight: '700' }, monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 10, marginBottom: 14 }, monthLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '800' }, filterRow: { marginBottom: 10 }, filterLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 6 }, chips: { gap: 8 }, chip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: theme.colors.surface }, chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, chipText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' }, chipTextSelected: { color: '#fff' }, loader: { marginTop: 36 }, error: { color: theme.colors.danger, marginTop: 24 }, empty: { color: theme.colors.textMuted, textAlign: 'center', marginTop: 32 }, card: { marginTop: 8, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }, row: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 }, divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }, icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primarySoft }, iconWarning: { backgroundColor: theme.colors.warningSoft }, copy: { flex: 1, minWidth: 0 }, rowTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' }, rowSubtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 }, amount: { color: theme.colors.text, fontSize: 14, fontWeight: '800' }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' }, sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 12 }, sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sheetTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text }, detailTitle: { fontSize: 22, fontWeight: '900', color: theme.colors.text, marginBottom: 4 }, detail: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, paddingVertical: 9 }, detailLabel: { color: theme.colors.textMuted, fontSize: 12 }, detailValue: { color: theme.colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 }, closeButton: { marginTop: 8, alignItems: 'center', borderRadius: 999, backgroundColor: theme.colors.primary, paddingVertical: 12 }, closeText: { color: '#fff', fontWeight: '800' }
});
