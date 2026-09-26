import { useEffect, useMemo, useState } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountingPeriod, Obligation } from '../model/accounting';
import { createAccountingRepository } from '../api/config';
import { formatDate, paymentLabel, periodActionLabel, t } from '../i18n';
import { formatMoneyWithCurrencyCode } from '../utils/money';
import { createThemeStyles, theme, useTheme } from '../theme/theme';
import { areAllObligationsPaid, calculationsReady, homeStatusCopy, issuePresentation, orderedIssues, statusForMonth, statusForPayment } from '../presentation/accounting';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { MonthSelector } from '../components/MonthSelector';
import { useLocale } from '../i18n/LocaleContext';
import { ErrorState, ListGroup, LoadingState, Section, StatusBanner } from '../components/ui';
import { DocumentDetailsModal } from '../components/DocumentDetailsModal';
import { ObligationDetailsModal } from '../components/ObligationDetailsModal';
import { IssueDetailsModal } from '../components/IssueDetailsModal';
import { invoiceClassificationLabel, invoiceCounterpartyLabel, invoicePaymentPresentation, receivedInvoiceGroups } from '../presentation/invoiceList';
import { useAuth } from '../auth/AuthContext';
import type { AccountingMonthParts } from '../data/accountingRepository';
import type { AppTabParamList } from '../navigation/AppNavigator';
import { obligationStatusText, outstandingObligationsMoney, homeInvoiceDirection, paymentStatusForDisplay } from '../presentation/accounting';

type Props = BottomTabScreenProps<AppTabParamList, 'Home'>;
export function HomeScreen({ navigation }: Props) {
  useTheme();
  useLocale();
  const [parts, setParts] = useState<AccountingMonthParts | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<AccountingPeriod['issues'][number] | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AccountingPeriod['invoices'][number] | null>(null);
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [manualPaymentBusyId, setManualPaymentBusyId] = useState<string | null>(null);
  const repository = useMemo(() => createAccountingRepository(), []);
  const { month: monthId, refreshVersion, refreshAccounting } = useAccountingMonth();
  const { isDemo } = useAuth();
  const [calculationBusy, setCalculationBusy] = useState(false);
  const [calculationError, setCalculationError] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<'success' | 'error' | 'uncertain' | null>(null);

  useEffect(() => {
    let active = true;
    setRefreshing(true);
    repository.getMonthParts(monthId).then((value) => { if (!active) return; setParts(value); setError(!value.period && Object.keys(value.failures).length === 5); }).catch(() => active && setError(true)).finally(() => active && setRefreshing(false));
    return () => { active = false; };
  }, [repository, monthId, retry, refreshVersion]);

  function reload() { setRetry((value) => value + 1); }

  async function markObligationManuallyPaid(payment: Obligation) {
    setManualPaymentBusyId(payment.id);
    try {
      await repository.markObligationManuallyPaid(monthId, payment.id, localDateToday(), 'MOBILE_MANUAL_PAYMENT');
      const updated = await repository.getMonthParts(monthId);
      setParts(updated);
      setSelectedObligation(null);
      setPaymentFeedback('success');
      refreshAccounting();
    } catch (reason) {
      setPaymentFeedback(reason instanceof Error && /timeout|timed out/i.test(reason.message) ? 'uncertain' : 'error');
      reload();
      throw reason;
    } finally {
      setManualPaymentBusyId(null);
    }
  }

  if (error) return <SafeAreaView style={styles.safe}><ErrorState title={t('common.unavailable')} onRetry={() => { setError(false); reload(); }} /></SafeAreaView>;
  if (!parts?.period) return <SafeAreaView style={styles.safe}><LoadingState /></SafeAreaView>;
  const month = parts.period;

  const monthlyStatus = statusForMonth(month);
  const documents = month.invoices;
  const dirtyCalculationIssue = orderedIssues(month.issues).find((issue) => issue.code.trim().toUpperCase() === 'DIRTY_CALCULATION') ?? null;
  const received = receivedInvoiceGroups(documents);
  const statusCopy = monthlyStatus === 'calculations_pending' && documents.length === 0
    ? { title: 'home.waitingForData', body: 'home.waitingForInvoicesBody' }
    : homeStatusCopy(monthlyStatus);
  const bannerKind = monthlyStatus === 'resolved' ? 'success' : monthlyStatus === 'requires_action' ? 'warning' : monthlyStatus === 'error' ? 'error' : monthlyStatus === 'unknown' ? 'unknown' : 'info';
  const allPaymentsPaid = areAllObligationsPaid(month.obligations);
  const paymentsReady = calculationsReady(month.calculations, month.obligations) || month.settlement.fullySettled;
  const outstandingTotal = allPaymentsPaid ? null : outstandingObligationsMoney(month.obligations);

  return <SafeAreaView style={styles.safe}><ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <MonthSelector loading={refreshing} />
    {paymentFeedback ? <StatusBanner kind={paymentFeedback === 'success' ? 'success' : 'warning'} title={t(paymentFeedback === 'success' ? 'settlements.manualPaidSuccess' : paymentFeedback === 'uncertain' ? 'settlements.manualPaidUncertain' : 'settlements.manualPaidFailure')} body={t('settlements.manualPaidRefresh')} /> : null}
    {parts.obligations == null ? <Section title={t('home.payments')}><ErrorState title={t('home.sectionUnavailable')} onRetry={reload} /></Section> : paymentsReady ? <Section title={allPaymentsPaid ? t('common.paid') : t('home.payments')} trailing={outstandingTotal && outstandingTotal.amount !== '0' ? <Text style={styles.totalInline} numberOfLines={1} adjustsFontSizeToFit>{formatMoneyWithCurrencyCode(outstandingTotal)}{outstandingTotal.currency ? '' : ` ${t('common.unknown')}`}</Text> : null}><ListGroup>{month.obligations.length ? month.obligations.map((payment, index) => <PaymentRow key={`${payment.id}-${index}`} payment={payment} last={index === month.obligations.length - 1} onPress={() => setSelectedObligation(payment)} />) : <Text style={styles.unavailable}>{t('home.noPayments')}</Text>}</ListGroup></Section> : <Section title={t('home.payments')}><ErrorState title={t('home.sectionUnavailable')} onRetry={reload} /></Section>}

    {dirtyCalculationIssue ? <Pressable onPress={() => setSelectedIssue(dirtyCalculationIssue)} accessibilityRole="button" accessibilityLabel={`${t(issuePresentation(dirtyCalculationIssue).title)}. ${t('home.issueDetails')}`}><StatusBanner kind="warning" title={issuePresentation(dirtyCalculationIssue).title} body={issuePresentation(dirtyCalculationIssue).body} /></Pressable> : ['calculations_pending', 'processing', 'unknown'].includes(monthlyStatus) ? <StatusBanner kind={bannerKind} title={t(statusCopy.title)} body={t(statusCopy.body)} /> : null}

    {parts.invoices == null ? <Section title={t('home.invoices')}><ErrorState title={t('home.sectionUnavailable')} onRetry={reload} /></Section> : received.income.length + received.costs.length > 0 ? <Section title={t('home.invoices')}>
      {received.income.length > 0 ? <ReceivedInvoiceGroup title={t('home.incomeInvoices')} invoices={received.income} onSelect={setSelectedDocument} onViewAll={() => navigation.navigate('Documents', { direction: homeInvoiceDirection('income') })} /> : null}
      {received.costs.length > 0 ? <ReceivedInvoiceGroup title={t('home.costBills')} invoices={received.costs} onSelect={setSelectedDocument} onViewAll={() => navigation.navigate('Documents', { direction: homeInvoiceDirection('costs') })} /> : null}
    </Section> : null}

    {month.allowedActions.length ? <Section title={t('home.actions')}><View style={styles.actions}>{month.allowedActions.filter((action): action is 'FREEZE' | 'REOPEN' => ['FREEZE', 'REOPEN'].includes(action)).map((action) => <Pressable key={action} disabled={actionBusy != null} onPress={() => { setActionBusy(action); void repository.performPeriodAction(month.id, action).then(() => setRetry((value) => value + 1)).catch(() => setError(true)).finally(() => setActionBusy(null)); }} style={[styles.actionButton, actionBusy === action && styles.actionBusy]}><Text style={styles.actionText}>{actionBusy === action ? t('common.loading') : periodActionLabel(action)}</Text></Pressable>)}</View></Section> : null}

  </ScrollView><IssueDetailsModal issue={selectedIssue} documents={documents} onClose={() => { setSelectedIssue(null); setCalculationError(false); }} onDocument={(document) => { setSelectedIssue(null); setSelectedDocument(document); }} isDemo={isDemo} calculating={calculationBusy} calculationError={calculationError} onCalculate={selectedIssue?.code.trim().toUpperCase() === 'DIRTY_CALCULATION' && !isDemo ? () => { if (calculationBusy) return; setCalculationBusy(true); setCalculationError(false); void repository.calculatePeriod(month.id).then(() => { setSelectedIssue(null); refreshAccounting(); }).catch(() => setCalculationError(true)).finally(() => setCalculationBusy(false)); } : undefined} /><DocumentDetailsModal item={selectedDocument} onClose={() => setSelectedDocument(null)} /><ObligationDetailsModal item={selectedObligation} busy={manualPaymentBusyId === selectedObligation?.id} onClose={() => setSelectedObligation(null)} onMarkManuallyPaid={markObligationManuallyPaid} /></SafeAreaView>;
}

function ReceivedInvoiceGroup({ title, invoices, onSelect, onViewAll }: { title: string; invoices: AccountingPeriod['invoices']; onSelect: (invoice: AccountingPeriod['invoices'][number]) => void; onViewAll: () => void }) {
  const allSettled = invoices.length > 0 && invoices.every((invoice) => ['MATCHED', 'MANUALLY_CONFIRMED'].includes(invoice.paymentStatus?.trim().toUpperCase() ?? ''));
  const needsReview = invoices.some((invoice) => invoice.approvalStatus?.trim().toUpperCase() === 'NEEDS_REVIEW');
  const [expanded, setExpanded] = useState(!allSettled);
  useEffect(() => { if (allSettled) setExpanded(false); }, [allSettled]);
  return <View style={styles.receivedGroup}>
    <Pressable onPress={onViewAll} style={({ pressed }) => [styles.receivedHeading, pressed && styles.groupHeadingPressed]} accessibilityRole="button" accessibilityLabel={`${title}, ${invoices.length}${needsReview ? `, ${t('home.reviewNeeded')}` : ''}`}><Text style={styles.receivedTitle}>{title}</Text><View style={styles.headingTrailing}>{needsReview ? <View style={styles.reviewIndicator}><View style={[styles.statusDot, { backgroundColor: theme.colors.warning }]} /><Text style={styles.reviewIndicatorText}>{t('home.reviewNeeded')}</Text></View> : null}<Text style={styles.receivedCount}>{invoices.length}</Text><Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} /></View></Pressable>
    {allSettled && !expanded ? <Pressable onPress={() => setExpanded(true)} style={styles.collapsedInvoice} accessibilityRole="button" accessibilityLabel={t('home.allPaid')}><Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success} /><Text style={styles.collapsedInvoiceText}>{t('home.allPaid')}</Text><Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} /></Pressable> : <ListGroup>{invoices.map((invoice, index) => <ReceivedInvoiceRow key={`${invoice.id}-${index}`} invoice={invoice} onPress={() => onSelect(invoice)} last={index === invoices.length - 1} />)}</ListGroup>}
  </View>;
}

function ReceivedInvoiceRow({ invoice, onPress, last }: { invoice: AccountingPeriod['invoices'][number]; onPress: () => void; last: boolean }) {
  const sourceType = invoice.sourceType?.trim().toUpperCase();
  const isKsef = sourceType === 'KSEF';
  const sourceIcon = isKsef ? 'shield-checkmark-outline' : 'document-text-outline';
  const sourceLabel = isKsef ? t('invoices.ksef') : sourceType === 'UPLOAD' ? t('invoices.sourceUpload') : t('common.unknown');
  const classification = invoiceClassificationLabel(invoice.direction, invoice.category);
  const payment = invoicePaymentPresentation(invoice.paymentStatus);
  const paymentText = payment ? t(payment.labelKey) : t('common.unknown');
  const paymentColor = payment?.tone === 'success' ? theme.colors.success : payment?.tone === 'warning' ? theme.colors.warning : payment?.tone === 'info' ? theme.colors.info : theme.colors.textMuted;
  const paymentBackground = payment?.tone === 'success' ? theme.colors.successSoft : payment?.tone === 'warning' ? theme.colors.warningSoft : payment?.tone === 'info' ? theme.colors.infoSoft : theme.colors.surfaceSecondary;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={[invoiceCounterpartyLabel(invoice), invoice.documentNumber, sourceLabel, paymentText].filter(Boolean).join(', ')} style={({ pressed }) => [styles.receivedRow, !last && styles.divider, pressed && styles.issuePressed]}>
    <View style={styles.receivedCopy}>
      <Ionicons name={sourceIcon} size={18} color={isKsef ? theme.colors.success : theme.colors.textSecondary} accessibilityElementsHidden importantForAccessibility="no" />
      <View style={styles.receivedIdentity}><Text style={styles.receivedName} numberOfLines={1}>{invoiceCounterpartyLabel(invoice)}</Text>{classification ? <Text style={styles.receivedClassification} numberOfLines={1}>{classification}</Text> : null}</View>
    </View>
    <View style={styles.receivedTrailing}>
      <View style={[styles.paymentBadge, { backgroundColor: paymentBackground }]}><Text style={[styles.paymentBadgeText, { color: paymentColor }]} numberOfLines={1}>{paymentText}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </View>
  </Pressable>;
}

function PaymentRow({ payment, last, onPress }: { payment: Obligation; last: boolean; onPress: () => void }) {
  const paid = ['PAID', 'OVERPAID'].includes(payment.status.trim().toUpperCase());
  const partial = payment.status.trim().toUpperCase() === 'PARTIALLY_PAID';
  const displayedStatus = paymentStatusForDisplay(payment);
  const overdue = displayedStatus === 'OVERDUE';
  const tone = overdue ? theme.colors.danger : paymentTone(statusForPayment(payment));
  const status = obligationStatusText(payment);
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${paymentLabel(payment.title)}, ${formatMoneyWithCurrencyCode(paid || partial ? payment.amount : payment.outstandingAmount)}, ${status}`} style={({ pressed }) => [styles.paymentRow, !last && styles.divider, pressed && styles.paymentPressed]}>
      <View style={styles.paymentCopy}><Text style={styles.paymentTitle}>{paymentLabel(payment.title)}</Text><Text style={styles.paymentDate}>{payment.dueDate ? formatDate(payment.dueDate) : t('settlements.dueDateUnavailable')}</Text></View>
      <View style={styles.paymentAmount}><Text style={styles.amount}>{formatMoneyWithCurrencyCode(paid || partial ? payment.amount : payment.outstandingAmount)}</Text><View style={styles.statusLine}><View style={[styles.statusDot, { backgroundColor: tone }]} /><Text style={[styles.paymentStatus, { color: tone }]}>{status}</Text></View></View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
  </Pressable>;
}

function localDateToday(): string { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

function paymentTone(status: ReturnType<typeof statusForPayment>): string {
  if (status === 'resolved') return theme.colors.success;
  if (status === 'error' || status === 'requires_action') return theme.colors.warning;
  return theme.colors.textMuted;
}

const styles = createThemeStyles({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  outstanding: { paddingVertical: theme.spacing.sm },
  total: { color: theme.colors.textPrimary, fontSize: theme.typography.display, lineHeight: 38, fontWeight: '800', letterSpacing: -0.5 },
  totalInline: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, fontWeight: '700', fontVariant: ['tabular-nums'] },
  zeroAmount: { color: theme.colors.textPrimary, fontSize: theme.typography.amount, lineHeight: 34, fontWeight: '700' },
  unavailable: { color: theme.colors.textMuted, fontSize: theme.typography.body },
  supporting: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, marginTop: theme.spacing.xs },
  paymentRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  paymentCopy: { flex: 1, minWidth: 0 },
  paymentTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '600' },
  paymentDate: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, marginTop: theme.spacing.xs },
  paymentAmount: { alignItems: 'flex-end' },
  amount: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700' },
  statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  paymentStatus: { fontSize: theme.typography.status },
  paymentPressed: { backgroundColor: theme.colors.surfaceSecondary },
  issuePressed: { backgroundColor: theme.colors.surfaceSecondary },
  receivedGroup: { marginTop: theme.spacing.sm }, receivedHeading: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.xs }, groupHeadingPressed: { opacity: 0.72 }, headingTrailing: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }, reviewIndicator: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }, reviewIndicatorText: { color: theme.colors.warning, fontSize: theme.typography.caption }, receivedTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '600' }, receivedCount: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting }, collapsedInvoice: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.successSoft, borderRadius: theme.radius.card }, collapsedInvoiceText: { flex: 1, color: theme.colors.success, fontWeight: '700' },
  receivedRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg }, receivedCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }, receivedIdentity: { flex: 1, minWidth: 0 }, receivedName: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '500' }, receivedClassification: { color: theme.colors.textSecondary, fontSize: theme.typography.caption, marginTop: 2 }, receivedTrailing: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }, paymentBadge: { maxWidth: 130, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.sm, paddingVertical: 4 }, paymentBadgeText: { fontSize: theme.typography.status, fontWeight: '600' },
  actions: { gap: theme.spacing.sm }, actionButton: { minHeight: 50, borderRadius: theme.radius.control, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' }, actionBusy: { opacity: 0.6 }, actionText: { color: theme.colors.onAccent, fontWeight: '800' }
});
