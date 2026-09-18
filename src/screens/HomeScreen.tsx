import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AccountingMonth, PaymentLine } from '../model/accounting';
import { createAccountingRepository } from '../api/config';
import { formatDate, formatMonth, paymentLabel, paymentStatusLabel, t } from '../i18n';
import { formatMoney } from '../utils/money';
import { theme } from '../theme/theme';
import { homeStatusCopy, issuePresentation, orderedIssues, statusForIssue, statusForMonth } from '../presentation/accounting';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { MonthSelector } from '../components/MonthSelector';
import { useLocale } from '../i18n/LocaleContext';
import { ErrorState, LoadingState, StatusBanner } from '../components/ui';
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
  useEffect(() => { let active = true; setMonth(null); setError(false); repository.getMonth(monthId).then((value) => active && setMonth(value)).catch(() => active && setError(true)); return () => { active = false; }; }, [repository, monthId, retry, refreshVersion]);
  if (error) return <SafeAreaView style={styles.safe}><ErrorState title={t('common.unavailable')} onRetry={() => { setError(false); setMonth(null); setRetry((value) => value + 1); }} /></SafeAreaView>;
  if (!month) return <SafeAreaView style={styles.safe}><LoadingState /></SafeAreaView>;
  const monthlyStatus = statusForMonth(month);
  const issues = orderedIssues(month.issues).filter((issue) => ['requires_action', 'setup_required', 'error'].includes(statusForIssue(issue))).slice(0, 3);
  const documents = [...(month.income ?? []), ...(month.costs ?? [])];
  const statusCopy = homeStatusCopy(monthlyStatus);
  const bannerKind = monthlyStatus === 'resolved' ? 'success' : monthlyStatus === 'requires_action' ? 'warning' : monthlyStatus === 'error' ? 'error' : monthlyStatus === 'unknown' ? 'unknown' : 'info';
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.greeting}>{t('home.greeting')}</Text><MonthSelector loading={!month} />
    {issues.length === 0 ? <StatusBanner kind={bannerKind} title={t(statusCopy.title)} body={t(statusCopy.body)} /> : null}
    <Text style={styles.sectionTitle}>{t('home.obligations')}</Text>{month.totalToPay.amount == null ? <Text style={styles.unavailable}>{t('home.amountUnavailable')}</Text> : <Text style={styles.total}>{formatMoney(month.totalToPay)}</Text>}
    <View style={styles.summary}><Summary label={paymentLabel('RYCZALT')} value={month.taxes.ryczalt} /><Summary label={paymentLabel('VAT')} value={month.taxes.vat} /><Summary label={paymentLabel('ZUS')} value={month.taxes.zus} /></View>
    <Text style={styles.sectionTitle}>{t('home.payments')}</Text>{month.payments.length ? <View style={styles.card}>{month.payments.map((payment, index) => <PaymentRow key={`${payment.id}-${index}`} payment={payment} />)}</View> : <Text style={styles.empty}>{t('home.noPayments')}</Text>}
    {issues.length ? <><Text style={styles.sectionTitle}>{t('home.attention')}</Text><View style={styles.card}>{issues.map((issue) => { const presentation = issuePresentation(issue); const action = resolveIssueAction(issue, documents); return <Pressable key={issue.id} onPress={() => setSelectedIssue(issue)} style={({ pressed }) => [styles.issue, pressed && styles.issuePressed]} accessibilityRole="button" accessibilityLabel={`${presentation.title}. ${t('home.issueDetails')}`}><Text style={styles.issueTitle}>{presentation.title}</Text><Text style={styles.issueBody}>{presentation.body}</Text>{action.kind === 'SUPPORTED_NAVIGATION' ? <Text style={styles.issueAction}>{t('home.checkDocument')}</Text> : null}</Pressable>; })}</View></> : null}
  </ScrollView><IssueDetailsModal issue={selectedIssue} documents={documents} onClose={() => setSelectedIssue(null)} onDocument={(document) => { setSelectedIssue(null); setSelectedDocument(document); }} /><DocumentDetailsModal item={selectedDocument} onClose={() => setSelectedDocument(null)} /></SafeAreaView>;
}
function Summary({ label, value }: { label: string; value: { amount: string | null; currency?: string } }) { return <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text style={[styles.summaryValue, value.amount == null && styles.muted]}>{value.amount == null ? t('common.unknown') : formatMoney(value)}</Text></View>; }
function PaymentRow({ payment }: { payment: PaymentLine }) { return <View style={styles.paymentRow}><View style={styles.paymentIcon}><Ionicons name="calendar-outline" size={19} color={theme.colors.primary} /></View><View style={styles.paymentCopy}><Text style={styles.paymentTitle}>{paymentLabel(payment.title)}</Text><Text style={styles.paymentDate}>{formatDate(payment.dueDate)}</Text></View><View style={styles.paymentAmount}><Text style={styles.amount}>{formatMoney(payment.outstandingAmount)}</Text><Text style={styles.paymentStatus}>{paymentStatusLabel(payment.status)}</Text></View></View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.background }, content: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }, greeting: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600', marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm }, sectionTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.section, fontWeight: '800', marginTop: theme.spacing.xxl }, total: { color: theme.colors.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, marginTop: theme.spacing.xs }, unavailable: { color: theme.colors.textMuted, fontSize: 16, marginTop: theme.spacing.sm }, summary: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, padding: theme.spacing.lg, marginTop: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.borderSubtle }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.sm }, summaryLabel: { color: theme.colors.textSecondary, fontSize: 15 }, summaryValue: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 15 }, muted: { color: theme.colors.textMuted }, card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, borderWidth: 1, borderColor: theme.colors.borderSubtle, overflow: 'hidden', marginTop: theme.spacing.md }, paymentRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 76, paddingHorizontal: theme.spacing.lg }, paymentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, paymentCopy: { flex: 1, minWidth: 0 }, paymentTitle: { color: theme.colors.textPrimary, fontWeight: '800' }, paymentDate: { color: theme.colors.textSecondary, marginTop: 4 }, paymentAmount: { alignItems: 'flex-end' }, amount: { color: theme.colors.textPrimary, fontWeight: '800' }, paymentStatus: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 4 }, issue: { padding: theme.spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.borderSubtle }, issuePressed: { backgroundColor: theme.colors.surfaceSecondary }, issueTitle: { color: theme.colors.textPrimary, fontWeight: '800' }, issueBody: { color: theme.colors.textSecondary, marginTop: 4, lineHeight: 20 }, issueAction: { color: theme.colors.accent, fontWeight: '800', marginTop: theme.spacing.md }, empty: { color: theme.colors.textSecondary, marginTop: theme.spacing.md } });
