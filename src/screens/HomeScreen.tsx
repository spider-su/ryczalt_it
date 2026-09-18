import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AccountingMonth, PaymentLine } from '../model/accounting';
import { createAccountingRepository } from '../api/config';
import { formatDate, formatMonth, paymentLabel, paymentStatusLabel, t } from '../i18n';
import { formatMoney } from '../utils/money';
import { theme } from '../theme/theme';
import { homeStatusCopy, orderedIssues, statusForIssue, statusForMonth } from '../presentation/accounting';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { MonthSelector } from '../components/MonthSelector';
import { useLocale } from '../i18n/LocaleContext';
import { ErrorState, LoadingState, StatusBanner } from '../components/ui';

export function HomeScreen() {
  useLocale();
  const [month, setMonth] = useState<AccountingMonth | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const repository = useMemo(() => createAccountingRepository(), []);
  const { month: monthId, refreshVersion } = useAccountingMonth();
  useEffect(() => { let active = true; setMonth(null); setError(false); repository.getMonth(monthId).then((value) => active && setMonth(value)).catch(() => active && setError(true)); return () => { active = false; }; }, [repository, monthId, retry, refreshVersion]);
  if (error) return <SafeAreaView style={styles.safe}><ErrorState title={t('common.unavailable')} onRetry={() => { setError(false); setMonth(null); setRetry((value) => value + 1); }} /></SafeAreaView>;
  if (!month) return <SafeAreaView style={styles.safe}><LoadingState /></SafeAreaView>;
  const monthlyStatus = statusForMonth(month); const needsAttention = monthlyStatus === 'requires_action' || monthlyStatus === 'error';
  const issues = orderedIssues(month.issues).filter((issue) => statusForIssue(issue) === 'requires_action' || statusForIssue(issue) === 'error').slice(0, 3);
  const statusCopy = homeStatusCopy(monthlyStatus);
  const bannerKind = monthlyStatus === 'resolved' ? 'success' : monthlyStatus === 'requires_action' ? 'warning' : monthlyStatus === 'error' ? 'error' : monthlyStatus === 'unknown' ? 'unknown' : 'info';
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.greeting}>{t('home.greeting')}</Text><MonthSelector loading={!month} />
    <StatusBanner kind={bannerKind} title={t(statusCopy.title)} body={t(statusCopy.body)} />
    <Text style={styles.sectionTitle}>{t('home.obligations')}</Text><Text style={styles.total}>{formatMoney(month.totalToPay)}</Text>
    <View style={styles.summary}><Summary label={paymentLabel('RYCZALT')} value={formatMoney(month.taxes.ryczalt)} /><Summary label={paymentLabel('VAT')} value={formatMoney(month.taxes.vat)} /><Summary label={paymentLabel('ZUS')} value={formatMoney(month.taxes.zus)} /></View>
    <Text style={styles.sectionTitle}>{t('home.payments')}</Text>{month.payments.length ? <View style={styles.card}>{month.payments.map((payment, index) => <PaymentRow key={`${payment.id}-${index}`} payment={payment} />)}</View> : <Text style={styles.empty}>{t('home.noPayments')}</Text>}
    <Text style={styles.sectionTitle}>{t('home.attention')}</Text>{issues.length ? <View style={styles.card}>{issues.map((issue) => <View key={issue.id} style={styles.issue}><Text style={styles.issueTitle}>{issue.title}</Text><Text style={styles.issueBody}>{issue.message}</Text></View>)}</View> : <Text style={styles.empty}>{t('home.noIssues')}</Text>}
  </ScrollView></SafeAreaView>;
}
function Summary({ label, value, muted }: { label: string; value: string; muted?: boolean }) { return <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text style={[styles.summaryValue, muted && styles.muted]}>{value}</Text></View>; }
function PaymentRow({ payment }: { payment: PaymentLine }) { return <View style={styles.paymentRow}><View style={styles.paymentIcon}><Ionicons name="calendar-outline" size={19} color={theme.colors.primary} /></View><View style={styles.paymentCopy}><Text style={styles.paymentTitle}>{paymentLabel(payment.title)}</Text><Text style={styles.paymentDate}>{formatDate(payment.dueDate)}</Text></View><View style={styles.paymentAmount}><Text style={styles.amount}>{formatMoney(payment.outstandingAmount)}</Text><Text style={styles.paymentStatus}>{paymentStatusLabel(payment.status)}</Text></View></View>; }
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.background }, content: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }, greeting: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600', marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm }, sectionTitle: { color: theme.colors.textPrimary, fontSize: theme.typography.section, fontWeight: '800', marginTop: theme.spacing.xxl }, total: { color: theme.colors.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, marginTop: theme.spacing.xs }, summary: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, padding: theme.spacing.lg, marginTop: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.borderSubtle }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: theme.spacing.sm }, summaryLabel: { color: theme.colors.textSecondary, fontSize: 15 }, summaryValue: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 15 }, muted: { color: theme.colors.textMuted }, card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, borderWidth: 1, borderColor: theme.colors.borderSubtle, overflow: 'hidden', marginTop: theme.spacing.md }, paymentRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 76, paddingHorizontal: theme.spacing.lg }, paymentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, paymentCopy: { flex: 1, minWidth: 0 }, paymentTitle: { color: theme.colors.textPrimary, fontWeight: '800' }, paymentDate: { color: theme.colors.textSecondary, marginTop: 4 }, paymentAmount: { alignItems: 'flex-end' }, amount: { color: theme.colors.textPrimary, fontWeight: '800' }, paymentStatus: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 4 }, issue: { padding: theme.spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.borderSubtle }, issueTitle: { color: theme.colors.textPrimary, fontWeight: '800' }, issueBody: { color: theme.colors.textSecondary, marginTop: 4, lineHeight: 20 }, empty: { color: theme.colors.textSecondary, marginTop: theme.spacing.md } });
