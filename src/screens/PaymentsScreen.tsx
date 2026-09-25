import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAccountingRepository } from '../api/config';
import { AccountingPeriod, PaymentHistoryLine, Obligation } from '../model/accounting';
import { formatDate, formatMonth, paymentLabel, t } from '../i18n';
import { formatMoneyWithCurrencyCode } from '../utils/money';
import { areAllObligationsPaid, isPaymentHistoryItem, isUpcomingPayment, obligationStatusText, outstandingObligationsMoney, paymentStatusForDisplay, statusForPayment } from '../presentation/accounting';
import { createThemeStyles, theme, useTheme } from '../theme/theme';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { MonthSelector } from '../components/MonthSelector';
import { useLocale } from '../i18n/LocaleContext';
import { ErrorState, FilterButton, ListGroup, LoadingState, PageHeader, Section, SegmentedControl, SelectionList, SheetHeader } from '../components/ui';
import { AccountingStatusSection } from '../components/AccountingStatusSection';
import { useAuth } from '../auth/AuthContext';
import { getNotificationPreferences, reconcilePaymentReminders } from '../notifications/notificationService';
import { ObligationDetailsModal } from '../components/ObligationDetailsModal';

type Filter = 'ALL' | 'RYCZALT' | 'VAT' | 'ZUS';
type StatusFilter = 'ALL' | 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'OVERDUE';

export function PaymentsScreen() {
  useTheme();
  const { locale } = useLocale();
  const { profileId, isDemo } = useAuth();
  const repository = useMemo(() => createAccountingRepository(), []);
  const [payments, setPayments] = useState<Obligation[]>([]);
  const [history, setHistory] = useState<PaymentHistoryLine[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [filterSheet, setFilterSheet] = useState(false);
  const [obligationsLoading, setObligationsLoading] = useState(true);
  const [obligationsError, setObligationsError] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [historyRetry, setHistoryRetry] = useState(0);
  const [obligationsRetry, setObligationsRetry] = useState(0);
  const [selected, setSelected] = useState<Obligation | null>(null);
  const [manualPaymentBusyId, setManualPaymentBusyId] = useState<string | null>(null);
  const [accountingPeriod, setAccountingPeriod] = useState<AccountingPeriod | null>(null);
  const { month, refreshVersion, refreshAccounting } = useAccountingMonth();

  useEffect(() => {
    let active = true;
    setObligationsLoading(true); setObligationsError(false); setPayments([]); setAccountingPeriod(null);
    repository.getMonth(month).then((value) => {
      if (!active) return;
      setPayments(value.obligations); setAccountingPeriod(value);
      if (!isDemo && profileId != null) void getNotificationPreferences(profileId).then((preferences) => { if (preferences.enabled) return reconcilePaymentReminders(profileId, month, value.obligations, preferences.leadDays, locale); }).catch(() => undefined);
    }).catch(() => active && setObligationsError(true)).finally(() => active && setObligationsLoading(false));
    return () => { active = false; };
  }, [repository, month, refreshVersion, obligationsRetry, profileId, locale, isDemo]);

  useEffect(() => {
    let active = true;
    setHistoryLoading(true); setHistoryError(false); setHistory([]);
    repository.getPaymentHistory(month, filter === 'ALL' ? undefined : filter).then((value) => active && setHistory(value)).catch(() => active && setHistoryError(true)).finally(() => active && setHistoryLoading(false));
    return () => { active = false; };
  }, [repository, month, filter, refreshVersion, historyRetry]);

  async function markObligationManuallyPaid(payment: Obligation) {
    setManualPaymentBusyId(payment.id);
    try {
      await repository.markObligationManuallyPaid(month, payment.id, localDateToday(), 'Paid manually from mobile app');
      refreshAccounting();
    } finally { setManualPaymentBusyId(null); }
  }

  const visible = payments.filter((item) => isUpcomingPayment(item) && (filter === 'ALL' || item.title.toUpperCase() === filter) && matchesStatusFilter(item, statusFilter));
  const visibleHistory = history.filter((item) => isPaymentHistoryItem(item) && matchesStatusFilter(item, statusFilter));
  const allPaid = areAllObligationsPaid(payments);
  const total = outstandingObligationsMoney(payments);
  const openCount = payments.filter(isUpcomingPayment).length;
  const filterOptions = [{ value: 'ALL' as const, label: t('common.all') }, { value: 'RYCZALT' as const, label: paymentLabel('RYCZALT') }, { value: 'VAT' as const, label: paymentLabel('VAT') }, { value: 'ZUS' as const, label: paymentLabel('ZUS') }];

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><PageHeader title={t('settlements.title')} /><MonthSelector loading={obligationsLoading || historyLoading} />
    <Section title={allPaid ? t('settlements.completedPeriod') : t('settlements.upcoming')} trailing={<FilterButton onPress={() => setFilterSheet(true)} active={statusFilter !== 'ALL'} />}>
      {!allPaid && payments.length > 0 ? <View style={styles.summary}><Text style={styles.total}>{formatMoneyWithCurrencyCode(total)}{total.currency ? '' : ` ${t('common.unknown')}`}</Text><Text style={styles.summaryNote}>{formatMonth(month)} · {openCount} {t('settlements.unpaidObligations')}</Text></View> : null}
      <SegmentedControl options={filterOptions} selected={filter} onSelect={setFilter} />
      {obligationsLoading ? <LoadingState /> : obligationsError ? <ErrorState title={t('common.unavailable')} onRetry={() => setObligationsRetry((value) => value + 1)} /> : visible.length === 0 ? <Text style={styles.empty}>{allPaid ? t('settlements.completedPeriod') : t('settlements.noPayments')}</Text> : <ListGroup>{visible.map((payment, index) => <PaymentRow key={`${payment.id}-${index}`} payment={payment} last={index === visible.length - 1} amountKind="outstanding" onPress={() => setSelected(payment)} />)}</ListGroup>}
    </Section>
    <AccountingStatusSection period={accountingPeriod} />
    <Section title={t('settlements.history')} tone="secondary">
      {historyLoading ? <LoadingState /> : historyError ? <ErrorState title={t('settlements.historyError')} onRetry={() => setHistoryRetry((value) => value + 1)} /> : visibleHistory.length === 0 ? <Text style={styles.note}>{t('settlements.noHistory')}</Text> : <ListGroup>{visibleHistory.map((payment, index) => <PaymentRow key={`${payment.id}-${index}`} payment={payment} last={index === visibleHistory.length - 1} amountKind="total" onPress={() => setSelected(payment)} />)}</ListGroup>}
    </Section>
  </ScrollView><PaymentFilterSheet visible={filterSheet} selected={statusFilter} onSelect={setStatusFilter} onClose={() => setFilterSheet(false)} /><ObligationDetailsModal item={selected} busy={manualPaymentBusyId === selected?.id} onClose={() => setSelected(null)} onMarkManuallyPaid={markObligationManuallyPaid} /></SafeAreaView>;
}

function matchesStatusFilter(payment: Pick<Obligation, 'status' | 'dueDate'>, filter: StatusFilter): boolean {
  if (filter === 'ALL') return true;
  const normalized = paymentStatusForDisplay(payment);
  if (filter === 'PAID') return ['PAID', 'OVERPAID', 'MATCHED'].includes(normalized);
  if (filter === 'OVERDUE') return normalized === 'OVERDUE';
  if (filter === 'PARTIALLY_PAID') return normalized === 'PARTIALLY_PAID';
  return ['OPEN', 'DUE'].includes(normalized);
}

function PaymentFilterSheet({ visible, selected, onSelect, onClose }: { visible: boolean; selected: StatusFilter; onSelect: (value: StatusFilter) => void; onClose: () => void }) {
  const options = [{ value: 'ALL' as const, label: t('common.all') }, { value: 'PAID' as const, label: t('common.paid') }, { value: 'UNPAID' as const, label: t('common.unpaid') }, { value: 'PARTIALLY_PAID' as const, label: t('common.partial') }, { value: 'OVERDUE' as const, label: t('common.overdue') }];
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={styles.sheet}><SheetHeader title={t('common.filters')} onClose={onClose} /><Text style={styles.filterTitle}>{t('settlements.status')}</Text><SelectionList options={options} selected={selected} onSelect={onSelect} /><Pressable style={styles.apply} onPress={onClose} accessibilityRole="button"><Text style={styles.applyText}>{t('common.close')}</Text></Pressable></View></View></Modal>;
}

function PaymentRow({ payment, last, amountKind, onPress }: { payment: Obligation; last: boolean; amountKind: 'outstanding' | 'total'; onPress: () => void }) {
  const state = statusForPayment(payment);
  const partial = payment.status.trim().toUpperCase() === 'PARTIALLY_PAID';
  const displayAmount = amountKind === 'total' || partial ? payment.amount : payment.outstandingAmount;
  const dueDate = payment.dueDate ? formatDate(payment.dueDate) : t('settlements.dueDateUnavailable');
  const displayStatus = paymentStatusForDisplay(payment);
  const tone = state === 'resolved' ? theme.colors.success : displayStatus === 'OVERDUE' ? theme.colors.danger : state === 'requires_action' ? theme.colors.warning : displayStatus === 'PARTIALLY_PAID' ? theme.colors.info : theme.colors.textMuted;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${paymentLabel(payment.title)}, ${obligationStatusText(payment)}`}><View style={styles.copy}><Text style={styles.rowTitle}>{paymentLabel(payment.title)}</Text><Text style={styles.subtitle}>{t('settlements.period')}: {formatMonth(payment.period ?? '')}</Text><Text style={styles.subtitle}>{t('settlements.dueDate')}: {dueDate}</Text></View><View style={styles.amount}><Text style={styles.amountText}>{formatMoneyWithCurrencyCode(displayAmount)}</Text><View style={styles.statusLine}><View style={[styles.statusDot, { backgroundColor: tone }]} /><Text style={[styles.status, { color: tone }]}>{obligationStatusText(payment)}</Text></View></View></Pressable>;
}

function localDateToday(): string { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

const styles = createThemeStyles({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  summary: { marginBottom: theme.spacing.md },
  total: { color: theme.colors.textPrimary, fontSize: theme.typography.amount, lineHeight: 34, fontWeight: '700' },
  summaryNote: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, marginTop: theme.spacing.xs },
  currencyUnavailable: { color: theme.colors.textMuted, fontSize: theme.typography.caption },
  empty: { color: theme.colors.textSecondary, lineHeight: 20, paddingVertical: theme.spacing.lg },
  note: { color: theme.colors.textSecondary, lineHeight: 20 },
  filterTitle: { color: theme.colors.textPrimary, fontWeight: '600', marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
  row: { minHeight: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  pressed: { backgroundColor: theme.colors.surfaceSecondary },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '600' },
  subtitle: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, marginTop: theme.spacing.xs },
  amount: { alignItems: 'flex-end', maxWidth: '34%' },
  amountText: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700' },
  statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  status: { fontSize: theme.typography.status },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl, gap: theme.spacing.md },
  apply: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.control, backgroundColor: theme.colors.accent, marginTop: theme.spacing.md },
  applyText: { color: theme.colors.onAccent, fontSize: theme.typography.button, fontWeight: '700' }
});
