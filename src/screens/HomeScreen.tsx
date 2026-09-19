import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountingMonth, PaymentLine } from '../model/accounting';
import { createAccountingRepository } from '../api/config';
import { formatDate, paymentLabel, paymentStatusLabel, t } from '../i18n';
import { formatMoney } from '../utils/money';
import { theme } from '../theme/theme';
import { homeStatusCopy, issuePresentation, orderedIssues, statusForIssue, statusForMonth } from '../presentation/accounting';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { MonthSelector } from '../components/MonthSelector';
import { useLocale } from '../i18n/LocaleContext';
import { ErrorState, KeyValueRow, ListGroup, LoadingState, PageHeader, Section, StatusBanner } from '../components/ui';
import { IssueDetailsModal } from '../components/IssueDetailsModal';
import { DocumentDetailsModal } from '../components/DocumentDetailsModal';
import { resolveIssueAction } from '../presentation/issueResolution';

export function HomeScreen() {
  useLocale();
  const [month, setMonth] = useState<AccountingMonth | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<AccountingMonth['issues'][number] | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AccountingMonth['income'][number] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const repository = useMemo(() => createAccountingRepository(), []);
  const { month: monthId, refreshVersion } = useAccountingMonth();

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
  const issues = orderedIssues(month.issues).filter((issue) => ['requires_action', 'setup_required', 'error'].includes(statusForIssue(issue))).slice(0, 3);
  const documents = [...(month.income ?? []), ...(month.costs ?? [])];
  const statusCopy = homeStatusCopy(monthlyStatus);
  const bannerKind = monthlyStatus === 'resolved' ? 'success' : monthlyStatus === 'requires_action' ? 'warning' : monthlyStatus === 'error' ? 'error' : monthlyStatus === 'unknown' ? 'unknown' : 'info';

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <PageHeader title={t('home.greeting')} />
    <MonthSelector loading={!month} />
    {issues.length === 0 ? <StatusBanner kind={bannerKind} title={t(statusCopy.title)} body={t(statusCopy.body)} /> : null}

    <Section title={t('home.obligations')}>
      <ListGroup>
        <KeyValueRow label={paymentLabel('RYCZALT')} value={formatMoney(month.taxes.ryczalt)} />
        <KeyValueRow label={paymentLabel('VAT')} value={formatMoney(month.taxes.vat)} />
        <KeyValueRow label={paymentLabel('ZUS')} value={formatMoney(month.taxes.zus)} />
      </ListGroup>
    </Section>

    <Section title={t('home.outstanding')}>
      {month.totalToPay.amount == null ? <Text style={styles.unavailable}>{t('home.amountUnavailable')}</Text> : <View style={styles.outstanding}><Text style={month.totalToPay.amount === '0' ? styles.zeroAmount : styles.total}>{formatMoney(month.totalToPay)}</Text>{month.totalToPay.amount === '0' && month.payments.length === 0 ? <Text style={styles.supporting}>{t('home.noPayments')}</Text> : null}</View>}
    </Section>

    {month.payments.length ? <Section title={t('home.payments')}><ListGroup>{month.payments.map((payment, index) => <PaymentRow key={`${payment.id}-${index}`} payment={payment} last={index === month.payments.length - 1} />)}</ListGroup></Section> : null}

    {issues.length ? <Section title={t('home.attention')}><ListGroup>{issues.map((issue, index) => { const presentation = issuePresentation(issue); const action = resolveIssueAction(issue, documents); return <Pressable key={`${issue.id}-${index}`} onPress={() => setSelectedIssue(issue)} style={({ pressed }) => [styles.issue, index < issues.length - 1 && styles.issueDivider, pressed && styles.issuePressed]} accessibilityRole="button" accessibilityLabel={`${presentation.title}. ${t('home.issueDetails')}`}><Text style={styles.issueTitle}>{presentation.title}</Text><Text style={styles.issueBody}>{presentation.body}</Text>{action.kind === 'SUPPORTED_NAVIGATION' ? <Text style={styles.issueAction}>{t('home.checkDocument')}</Text> : null}</Pressable>; })}</ListGroup></Section> : null}
  </ScrollView><IssueDetailsModal issue={selectedIssue} documents={documents} onClose={() => setSelectedIssue(null)} onDocument={(document) => { setSelectedIssue(null); setSelectedDocument(document); }} /><DocumentDetailsModal item={selectedDocument} onClose={() => setSelectedDocument(null)} /></SafeAreaView>;
}

function PaymentRow({ payment, last }: { payment: PaymentLine; last: boolean }) {
  return <View style={[styles.paymentRow, !last && styles.divider]}><View style={styles.paymentCopy}><Text style={styles.paymentTitle}>{paymentLabel(payment.title)}</Text><Text style={styles.paymentDate}>{formatDate(payment.dueDate)}</Text></View><View style={styles.paymentAmount}><Text style={styles.amount}>{formatMoney(payment.outstandingAmount)}</Text><Text style={styles.paymentStatus}>{paymentStatusLabel(payment.status)}</Text></View></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  outstanding: { paddingVertical: theme.spacing.sm },
  total: { color: theme.colors.textPrimary, fontSize: theme.typography.display, lineHeight: 38, fontWeight: '800', letterSpacing: -0.5 },
  zeroAmount: { color: theme.colors.textPrimary, fontSize: theme.typography.amount, lineHeight: 34, fontWeight: '700' },
  unavailable: { color: theme.colors.textMuted, fontSize: theme.typography.body },
  supporting: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, marginTop: theme.spacing.xs },
  paymentRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  paymentCopy: { flex: 1, minWidth: 0 },
  paymentTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '600' },
  paymentDate: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, marginTop: theme.spacing.xs },
  paymentAmount: { alignItems: 'flex-end' },
  amount: { color: theme.colors.textPrimary, fontSize: theme.typography.body, fontWeight: '700' },
  paymentStatus: { color: theme.colors.textSecondary, fontSize: theme.typography.status, marginTop: theme.spacing.xs },
  issue: { paddingVertical: theme.spacing.lg },
  issueDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  issuePressed: { backgroundColor: theme.colors.surfaceSecondary },
  issueTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '700' },
  issueBody: { color: theme.colors.textSecondary, lineHeight: 20, marginTop: theme.spacing.xs },
  issueAction: { color: theme.colors.accent, fontWeight: '700', marginTop: theme.spacing.md }
});
