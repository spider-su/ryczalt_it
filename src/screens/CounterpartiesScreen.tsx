import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAccountingRepository } from '../api/config';
import type { Counterparty } from '../model/accounting';
import { useLocale } from '../i18n/LocaleContext';
import { t } from '../i18n';
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
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.overlay}><View style={styles.sheet}><SheetHeader title={t('counterparties.title')} onClose={onClose} />{loading ? <LoadingState /> : error ? <ErrorState title={t('counterparties.error')} /> : <ScrollView contentContainerStyle={styles.content}>{items.length === 0 ? <Text style={styles.muted}>{t('counterparties.empty')}</Text> : <ListGroup>{items.map((item, index) => <Pressable key={item.id} onPress={() => setSelected(item)} style={[styles.row, index < items.length - 1 && styles.divider]}><View style={styles.copy}><Text style={styles.name}>{item.displayName}</Text><Text style={styles.meta}>{item.taxIdentifier || t('common.unknown')} · {item.invoiceCount} {t('counterparties.invoices')}</Text></View><Text style={styles.rules}>{item.ruleCount} {t('counterparties.rules')}</Text></Pressable>)}</ListGroup>}</ScrollView>}{selected ? <CounterpartyDetail item={selected} onClose={() => setSelected(null)} /> : null}</View></SafeAreaView></Modal>;
}

function CounterpartyDetail({ item, onClose }: { item: Counterparty; onClose: () => void }) {
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View style={styles.detailOverlay}><View style={styles.detail}><SheetHeader title={t('counterparties.detail')} onClose={onClose} /><Text style={styles.detailName}>{item.displayName}</Text><Text style={styles.meta}>{item.legalName}</Text><Text style={styles.meta}>{item.country || t('common.unknown')} · {item.taxIdentifier || t('common.unknown')}</Text><Text style={styles.section}>{t('counterparties.rules')}</Text><Text style={styles.muted}>{item.ruleCount ? `${item.ruleCount} ${t('counterparties.rules')}` : t('counterparties.rulesPending')}</Text><Text style={styles.section}>{t('counterparties.history')}</Text><Text style={styles.muted}>{item.invoiceCount} {t('counterparties.invoices')}</Text></View></View></Modal>;
}

const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }, sheet: { maxHeight: '90%', backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl }, content: { paddingBottom: theme.spacing.xxxl }, row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.md }, divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider }, copy: { flex: 1 }, name: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 }, meta: { color: theme.colors.textSecondary, marginTop: theme.spacing.xs }, rules: { color: theme.colors.accent, fontWeight: '700' }, muted: { color: theme.colors.textSecondary, lineHeight: 22, paddingVertical: theme.spacing.lg }, detailOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }, detail: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }, detailName: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: theme.spacing.lg }, section: { color: theme.colors.textPrimary, fontWeight: '700', marginTop: theme.spacing.xl, marginBottom: theme.spacing.xs }
});
