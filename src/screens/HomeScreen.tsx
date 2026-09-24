import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountingPeriod, Obligation } from '../model/accounting';
import { createAccountingRepository } from '../api/config';
import { formatCurrency, formatDate, invoicePaymentStatusKey, paymentLabel, paymentStatusLabel, periodActionLabel, t } from '../i18n';
import { formatMoneyWithoutCurrency } from '../utils/money';
import { theme } from '../theme/theme';
import { areAllObligationsPaid, calculationsReady, homeStatusCopy, isQuietIssue, issuePresentation, orderedIssues, statusForIssue, statusForMonth, statusForPayment } from '../presentation/accounting';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { MonthSelector } from '../components/MonthSelector';
import { useLocale } from '../i18n/LocaleContext';
import { ErrorState, ListGroup, LoadingState, Section, StatusBanner } from '../components/ui';
import { IssueDetailsModal } from '../components/IssueDetailsModal';
import { DocumentDetailsModal } from '../components/DocumentDetailsModal';
import { resolveIssueAction } from '../presentation/issueResolution';
import { invoiceCounterpartyLabel, receivedInvoiceGroups } from '../presentation/invoiceList';
import { useAuth } from '../auth/AuthContext';

export function HomeScreen() {
  useLocale();
  const [month, setMonth] = useState<AccountingPeriod | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<AccountingPeriod['issues'][number] | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AccountingPeriod['invoices'][number] | null>(null);
  const [error, setError] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const repository = useMemo(() => createAccountingRepository(), []);
  const { month: monthId, refreshVersion, refreshAccounting } = useAccountingMonth();
  const { isDemo } = useAuth();
  const [calculationBusy, setCalculationBusy] = useState(false);
  const [calculationError, setCalculationError] = useState(false);

  useEffect(() => {
    let active = true;
    setMonth(null);
    setError(false);
    repository.getMonth(monthId).then((value) => active && setMonth(value)).catch(() => active && setError(true));
    return () => { active = false; };
  }, [repository, monthId, retry, refreshVersion]);

  if (error) return <SafeAreaView style={styles.safe}><ErrorState title={t('common.unavailable')} onRetry={() => { setError(false); setMonth(null); setRetry((value) => value + 1); }} /></SafeAreaView>;
  if (!month) return <SafeAreaView style={styles.safe}><LoadingState /></SafeAreaView>;

  const monthlyStatus = statusForMonth(month);
  const issues = orderedIssues(month.issues).filter((issue) => !isQuietIssue(issue) && ['requires_action', 'setup_required', 'error'].includes(statusForIssue(issue))).slice(0, 3);
  const documents = month.invoices;
  const received = receivedInvoiceGroups(documents);
  const statusCopy = monthlyStatus === 'calculations_pending'
    ? documents.length === 0
      ? { title: 'home.waitingForData', body: 'home.waitingForInvoicesBody' }
      : { title: 'home.calculationsPendingTitle', body: 'home.calculationsPendingBody' }
    : homeStatusCopy(monthlyStatus);
  const bannerKind = monthlyStatus === 'resolved' ? 'success' : monthlyStatus === 'requires_action' ? 'warning' : monthlyStatus === 'error' ? 'error' : monthlyStatus === 'unknown' ? 'unknown' : 'info';
  const allPaymentsPaid = areAllObligationsPaid(month.obligations);
  const paymentsReady = calculationsReady(month.calculations, month.obligations) || month.settlement.fullySettled;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <MonthSelector loading={!month} />
    {paymentsReady ? <Section title={allPaymentsPaid ? t('common.paid') : t('home.payments')}><ListGroup>{month.obligations.length ? month.obligations.map((payment, index) => <PaymentRow key={`${payment.id}-${index}`} payment={payment} last={index === month.obligations.length - 1} />) : <Text style={styles.unavailable}>{t('home.noPayments')}</Text>}</ListGroup></Section> : null}

    {issues.length === 0 && monthlyStatus !== 'resolved' && monthlyStatus !== 'settlement_pending' ? <StatusBanner kind={bannerKind} title={t(statusCopy.title)} body={t(statusCopy.body)} /> : null}

    {received.income.length + received.costs.length > 0 ? <Section title={t('home.received')}>
      {received.income.length > 0 ? <ReceivedInvoiceGroup title={t('home.incomeInvoices')} invoices={received.income} onSelect={setSelectedDocument} /> : null}
      {received.costs.length > 0 ? <ReceivedInvoiceGroup title={t('home.costBills')} invoices={received.costs} onSelect={setSelectedDocument} /> : null}
    </Section> : null}

    {month.allowedActions.length ? <Section title={t('home.actions')}><View style={styles.actions}>{month.allowedActions.filter((action): action is 'FREEZE' | 'REOPEN' => ['FREEZE', 'REOPEN'].includes(action)).map((action) => <Pressable key={action} disabled={actionBusy != null} onPress={() => { setActionBusy(action); void repository.performPeriodAction(month.id, action).then(() => setRetry((value) => value + 1)).catch(() => setError(true)).finally(() => setActionBusy(null)); }} style={[styles.actionButton, actionBusy === action && styles.actionBusy]}><Text style={styles.actionText}>{actionBusy === action ? t('common.loading') : periodActionLabel(action)}</Text></Pressable>)}</View></Section> : null}

    {issues.length ? <Section title={t('home.attention')}><ListGroup>{issues.map((issue, index) => { const presentation = issuePresentation(issue); const action = resolveIssueAction(issue, documents); return <Pressable key={`${issue.id}-${index}`} onPress={() => setSelectedIssue(issue)} style={({ pressed }) => [styles.issue, index < issues.length - 1 && styles.issueDivider, pressed && styles.issuePressed]} accessibilityRole="button" accessibilityLabel={`${presentation.title}. ${t('home.issueDetails')}`}><Text style={styles.issueTitle}>{presentation.title}</Text><Text style={styles.issueBody}>{presentation.body}</Text>{action.kind === 'SUPPORTED_NAVIGATION' ? <Text style={styles.issueAction}>{t('home.checkDocument')}</Text> : null}</Pressable>; })}</ListGroup></Section> : null}
  </ScrollView><IssueDetailsModal issue={selectedIssue} documents={documents} onClose={() => { setSelectedIssue(null); setCalculationError(false); }} onDocument={(document) => { setSelectedIssue(null); setSelectedDocument(document); }} isDemo={isDemo} calculating={calculationBusy} calculationError={calculationError} onCalculate={selectedIssue?.code.trim().toUpperCase() === 'DIRTY_CALCULATION' && !isDemo ? () => { if (calculationBusy) return; setCalculationBusy(true); setCalculationError(false); void repository.calculatePeriod(month.id).then(() => { setSelectedIssue(null); refreshAccounting(); }).catch(() => setCalculationError(true)).finally(() => setCalculationBusy(false)); } : undefined} /><DocumentDetailsModal item={selectedDocument} onClose={() => setSelectedDocument(null)} /></SafeAreaView>;
}

function ReceivedInvoiceGroup({ title, invoices, onSelect }: { title: string; invoices: AccountingPeriod['invoices']; onSelect: (invoice: AccountingPeriod['invoices'][number]) => void }) {
  return <View style={styles.receivedGroup}>
    <View style={styles.receivedHeading}><Text style={styles.receivedTitle}>{title}</Text><Text style={styles.receivedCount}>{invoices.length}</Text></View>
    <ListGroup>{invoices.map((invoice, index) => <ReceivedInvoiceRow key={`${invoice.id}-${index}`} invoice={invoice} onPress={() => onSelect(invoice)} last={index === invoices.length - 1} />)}</ListGroup>
  </View>;
}

function ReceivedInvoiceRow({ invoice, onPress, last }: { invoice: AccountingPeriod['invoices'][number]; onPress: () => void; last: boolean }) {
  const sourceType = invoice.sourceType?.trim().toUpperCase();
  const isKsef = sourceType === 'KSEF';
  const sourceIcon = isKsef ? 'shield-checkmark-outline' : 'document-text-outline';
  const sourceLabel = isKsef ? t('invoices.ksef') : sourceType === 'UPLOAD' ? t('invoices.sourceUpload') : t('common.unknown');
  const payment = invoicePaymentStatusKey(invoice.paymentStatus);
  const paymentLabel = payment === 'matched' || payment === 'manuallyConfirmed' ? t('common.paid')
    : payment === 'partiallyMatched' ? t('common.partial')
    : payment === 'unmatched' ? t('common.unpaid')
    : payment === 'notRequired' ? t('invoices.paymentNotRequiredShort')
    : t('common.unknown');
  const paymentColor = payment === 'matched' || payment === 'manuallyConfirmed' ? theme.colors.success
    : payment === 'partiallyMatched' || payment === 'unmatched' ? theme.colors.warning
    : theme.colors.textMuted;
  const paymentBackground = payment === 'matched' || payment === 'manuallyConfirmed' ? theme.colors.successSoft
    : payment === 'partiallyMatched' || payment === 'unmatched' ? theme.colors.warningSoft
    : theme.colors.surfaceSecondary;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={[invoiceCounterpartyLabel(invoice), invoice.documentNumber, sourceLabel, paymentLabel].filter(Boolean).join(', ')} style={({ pressed }) => [styles.receivedRow, !last && styles.divider, pressed && styles.issuePressed]}>
    <View style={styles.receivedCopy}>
      <Ionicons name={sourceIcon} size={18} color={isKsef ? theme.colors.success : theme.colors.textSecondary} accessibilityElementsHidden importantForAccessibility="no" />
      <Text style={styles.receivedName} numberOfLines={1}>{invoiceCounterpartyLabel(invoice)}</Text>
    </View>
    <View style={styles.receivedTrailing}>
      <View style={[styles.paymentBadge, { backgroundColor: paymentBackground }]}><Text style={[styles.paymentBadgeText, { color: paymentColor }]} numberOfLines={1}>{paymentLabel}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </View>
  </Pressable>;
}

function PaymentRow({ payment, last }: { payment: Obligation; last: boolean }) {
  const paid = ['PAID', 'OVERPAID'].includes(payment.status.trim().toUpperCase());
  const partial = payment.status.trim().toUpperCase() === 'PARTIALLY_PAID';
  const tone = paymentTone(statusForPayment(payment));
  const status = partial ? `${paymentStatusLabel(payment.status)} (${formatCurrency(payment.outstandingAmount.amount)} ${t('settlements.remainingShort')})` : paymentStatusLabel(payment.status);
  return <View style={[styles.paymentRow, !last && styles.divider]}><View style={styles.paymentCopy}><Text style={styles.paymentTitle}>{paymentLabel(payment.title)}</Text><Text style={styles.paymentDate}>{payment.dueDate ? formatDate(payment.dueDate) : t('settlements.dueDateUnavailable')}</Text></View><View style={styles.paymentAmount}><Text style={styles.amount}>{formatMoneyWithoutCurrency(paid || partial ? payment.amount : payment.outstandingAmount)}</Text><View style={styles.statusLine}><View style={[styles.statusDot, { backgroundColor: tone }]} /><Text style={[styles.paymentStatus, { color: tone }]}>{status}</Text></View></View></View>;
}

function paymentTone(status: ReturnType<typeof statusForPayment>): string {
  if (status === 'resolved') return theme.colors.success;
  if (status === 'error' || status === 'requires_action') return theme.colors.warning;
  return theme.colors.textMuted;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  outstanding: { paddingVertical: theme.spacing.sm },
  total: { color: theme.colors.textPrimary, fontSize: theme.typography.display, lineHeight: 38, fontWeight: '800', letterSpacing: -0.5 },
  zeroAmount: { color: theme.colors.textPrimary, fontSize: theme.typography.amount, lineHeight: 34, fontWeight: '700' },
  unavailable: { color: theme.colors.textMuted, fontSize: theme.typography.body },
  supporting: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, marginTop: theme.spacing.xs },
  paymentRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  paymentCopy: { flex: 1, minWidth: 0 },
  paymentTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '600' },
  paymentDate: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, marginTop: theme.spacing.xs },
  paymentAmount: { alignItems: 'flex-end' },
  amount: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '700' },
  statusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  paymentStatus: { fontSize: theme.typography.status },
  issue: { paddingVertical: theme.spacing.lg },
  issueDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  issuePressed: { backgroundColor: theme.colors.surfaceSecondary },
  issueTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '700' },
  issueBody: { color: theme.colors.textSecondary, lineHeight: 20, marginTop: theme.spacing.xs },
  issueAction: { color: theme.colors.accent, fontWeight: '700', marginTop: theme.spacing.md }
  ,receivedGroup: { marginTop: theme.spacing.sm }, receivedHeading: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.xs }, receivedTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '600' }, receivedCount: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting },
  receivedRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg }, receivedCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }, receivedName: { flex: 1, minWidth: 0, color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '500' }, receivedTrailing: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }, paymentBadge: { maxWidth: 130, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.sm, paddingVertical: 4 }, paymentBadgeText: { fontSize: theme.typography.status, fontWeight: '600' },
  actions: { gap: theme.spacing.sm }, actionButton: { minHeight: 50, borderRadius: theme.radius.control, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' }, actionBusy: { opacity: 0.6 }, actionText: { color: theme.colors.onAccent, fontWeight: '800' }
});
