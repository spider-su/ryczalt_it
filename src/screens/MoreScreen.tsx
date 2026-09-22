import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { t } from '../i18n';
import { useLocale } from '../i18n/LocaleContext';
import { theme } from '../theme/theme';
import { createAccountingRepository } from '../api/config';
import { AccountingPeriod } from '../model/accounting';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { CounterpartiesScreen } from './CounterpartiesScreen';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';
import { KeyValueRow, ListGroup, ListRow, PageHeader, Section, SheetHeader } from '../components/ui';

export function MoreScreen() {
  const { signOut } = useAuth();
  const { locale, setLocale } = useLocale();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [counterpartiesOpen, setCounterpartiesOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [status, setStatus] = React.useState<AccountingPeriod | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const repository = React.useMemo(() => createAccountingRepository(), []);
  const { month, refreshVersion } = useAccountingMonth();

  React.useEffect(() => {
    let active = true;
    setStatus(null); setStatusLoading(true);
    repository.getMonth(month).then((value) => active && setStatus(value)).catch(() => active && setStatus(null)).finally(() => active && setStatusLoading(false));
    return () => { active = false; };
  }, [repository, month, refreshVersion]);

  const rows: [keyof typeof Ionicons.glyphMap, string, (() => void)?][] = [
    ['business-outline', t('more.counterparties'), () => setCounterpartiesOpen(true)],
    ['settings-outline', t('more.settings'), () => setSettingsOpen(true)],
    ['notifications-outline', t('more.notifications'), () => setNotificationsOpen(true)],
    ['download-outline', t('more.reports')],
    ['help-circle-outline', t('more.help')]
  ];

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><PageHeader title={t('more.title')} /><ListGroup>{rows.map(([icon, label, onPress], index) => <ListRow key={label} icon={icon} title={label} onPress={onPress} last={index === rows.length - 1} />)}</ListGroup>
    <Section title={t('more.systems')}><ListGroup><KeyValueRow label={t('more.periodStatus')} value={statusLoading ? t('common.loading') : status?.status ?? t('common.unknown')} state={statusLoading ? 'pending' : 'unknown'} /><KeyValueRow label={t('more.completeness')} value={statusLoading ? t('common.loading') : status?.completeness.status ?? t('common.unknown')} state={status?.completeness.blockingIssueCount ? 'attention' : 'success'} /><KeyValueRow label={t('more.reconciliation')} value={statusLoading ? t('common.loading') : status?.reconciliation.state ?? t('common.unknown')} state={status?.reconciliation.state === 'healthy' ? 'success' : 'unknown'} /></ListGroup></Section>
    <Pressable style={styles.signOut} onPress={signOut} accessibilityRole="button" accessibilityLabel={t('more.signOut')}><Ionicons name="log-out-outline" size={21} color={theme.colors.danger} /><Text style={styles.signOutText}>{t('more.signOut')}</Text></Pressable>
  </ScrollView><SettingsModal visible={settingsOpen} locale={locale} onClose={() => setSettingsOpen(false)} onLocale={setLocale} /><CounterpartiesScreen visible={counterpartiesOpen} onClose={() => setCounterpartiesOpen(false)} /><NotificationSettingsScreen visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} /></SafeAreaView>;
}

function SettingsModal({ visible, locale, onClose, onLocale }: { visible: boolean; locale: 'pl' | 'en'; onClose: () => void; onLocale: (locale: 'pl' | 'en') => Promise<void> }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={styles.sheet}><SheetHeader title={t('settings.title')} onClose={onClose} /><Text style={styles.description}>{t('settings.languageDescription')}</Text><Text style={styles.languageHeading}>{t('settings.language')}</Text><ListGroup><LanguageRow label={t('settings.polish')} selected={locale === 'pl'} onPress={() => { void onLocale('pl').catch(() => undefined); }} /><LanguageRow label={t('settings.english')} selected={locale === 'en'} last onPress={() => { void onLocale('en').catch(() => undefined); }} /></ListGroup></View></View></Modal>;
}

function LanguageRow({ label, selected, onPress, last = false }: { label: string; selected: boolean; onPress: () => void; last?: boolean }) {
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.languageRow, !last && styles.languageDivider]}><Text style={styles.languageText}>{label}</Text>{selected && <Ionicons name="checkmark" size={22} color={theme.colors.primary} />}</Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  signOut: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xxxl, borderRadius: theme.radius.control, backgroundColor: theme.colors.dangerSoft },
  signOutText: { color: theme.colors.danger, fontSize: theme.typography.button, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  description: { color: theme.colors.textSecondary, lineHeight: 20, marginBottom: theme.spacing.xl },
  languageHeading: { color: theme.colors.textPrimary, fontWeight: '700', marginBottom: theme.spacing.sm },
  languageRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  languageDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  languageText: { color: theme.colors.textPrimary, fontSize: theme.typography.body, fontWeight: '600' }
});
