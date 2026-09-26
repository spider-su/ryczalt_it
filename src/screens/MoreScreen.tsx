import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { completenessStatusLabel, formatMonth, t } from '../i18n';
import { useLocale } from '../i18n/LocaleContext';
import { createThemeStyles, theme, useTheme, type AppearancePreference } from '../theme/theme';
import { createAccountingRepository } from '../api/config';
import { AccountingPeriod } from '../model/accounting';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { CounterpartiesScreen } from './CounterpartiesScreen';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';
import { KeyValueRow, ListGroup, ListRow, PageHeader, Section, SheetHeader } from '../components/ui';
import { ErrorState, LoadingState } from '../components/ui';

export function MoreScreen() {
  useTheme();
  const { signOut, isDemo } = useAuth();
  const { locale, setLocale } = useLocale();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [counterpartiesOpen, setCounterpartiesOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [status, setStatus] = React.useState<AccountingPeriod | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [statusError, setStatusError] = React.useState(false);
  const repository = React.useMemo(() => createAccountingRepository(), []);
  const { month, refreshVersion } = useAccountingMonth();
  const completeness = status?.completeness.status.trim().toUpperCase();
  const completenessTone = status?.completeness.blockingIssueCount ? 'attention' : completeness === 'COMPLETE' ? 'success' : completeness === 'INCOMPLETE' ? 'attention' : 'unknown';

  React.useEffect(() => {
    let active = true;
    setStatus(null); setStatusError(false); setStatusLoading(true);
    repository.getMonth(month).then((value) => active && setStatus(value)).catch(() => active && setStatusError(true)).finally(() => active && setStatusLoading(false));
    return () => { active = false; };
  }, [repository, month, refreshVersion]);

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; disabled?: boolean }[] = [
    { icon: 'business-outline', label: t('more.counterparties'), onPress: () => setCounterpartiesOpen(true) },
    { icon: 'settings-outline', label: t('more.settings'), onPress: () => setSettingsOpen(true) },
    { icon: 'notifications-outline', label: t('more.notifications'), onPress: () => setNotificationsOpen(true) },
    { icon: 'download-outline', label: t('more.reports'), disabled: true },
    { icon: 'help-circle-outline', label: t('more.help'), disabled: true }
  ];

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><PageHeader title={t('more.title')} />{isDemo ? <View style={styles.demoBanner}><Ionicons name="flask-outline" size={20} color={theme.colors.primary} /><View style={styles.demoCopy}><Text style={styles.demoTitle}>{t('more.demoProfile')}</Text><Text style={styles.demoDescription}>{t('more.demoDescription')}</Text></View></View> : null}<ListGroup>{rows.map((row, index) => <ListRow key={row.label} icon={row.icon} title={row.label} onPress={row.onPress} disabled={row.disabled} disabledLabel={row.disabled ? t('more.comingSoon') : undefined} last={index === rows.length - 1} />)}</ListGroup>
    <Section title={t('more.health')}>{statusLoading ? <LoadingState /> : statusError ? <ErrorState title={t('more.healthUnavailable')} /> : <ListGroup><KeyValueRow label={formatMonth(month)} value={completenessStatusLabel(status?.completeness.status)} state={completenessTone} /></ListGroup>}</Section>
    <Pressable style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]} onPress={signOut} accessibilityRole="button" accessibilityLabel={t('more.signOut')}><Ionicons name="log-out-outline" size={21} color={theme.colors.danger} /><Text style={styles.signOutText}>{t('more.signOut')}</Text></Pressable>
  </ScrollView><SettingsModal visible={settingsOpen} locale={locale} onClose={() => setSettingsOpen(false)} onLocale={setLocale} /><CounterpartiesScreen visible={counterpartiesOpen} onClose={() => setCounterpartiesOpen(false)} /><NotificationSettingsScreen visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} /></SafeAreaView>;
}

function SettingsModal({ visible, locale, onClose, onLocale }: { visible: boolean; locale: 'pl' | 'en'; onClose: () => void; onLocale: (locale: 'pl' | 'en') => Promise<void> }) {
  const { preference, setPreference } = useTheme();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><View style={styles.sheet}><SheetHeader title={t('settings.title')} onClose={onClose} /><Text style={styles.description}>{t('settings.languageDescription')}</Text><Text style={styles.languageHeading}>{t('settings.language')}</Text><ListGroup><LanguageRow label={t('settings.polish')} selected={locale === 'pl'} onPress={() => { void onLocale('pl').catch(() => undefined); }} /><LanguageRow label={t('settings.english')} selected={locale === 'en'} last onPress={() => { void onLocale('en').catch(() => undefined); }} /></ListGroup><Text style={[styles.description, styles.appearanceDescription]}>{t('settings.appearanceDescription')}</Text><Text style={styles.languageHeading}>{t('settings.appearance')}</Text><ListGroup><AppearanceRow label={t('settings.light')} value="light" selected={preference === 'light'} onPress={() => { void setPreference('light'); }} /><AppearanceRow label={t('settings.dark')} value="dark" selected={preference === 'dark'} onPress={() => { void setPreference('dark'); }} /><AppearanceRow label={t('settings.system')} value="system" selected={preference === 'system'} last onPress={() => { void setPreference('system'); }} /></ListGroup><Text style={styles.systemDescription}>{t('settings.systemDescription')}</Text></View></View></Modal>;
}

function LanguageRow({ label, selected, onPress, last = false }: { label: string; selected: boolean; onPress: () => void; last?: boolean }) {
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.languageRow, !last && styles.languageDivider]}><Text style={styles.languageText}>{label}</Text>{selected && <Ionicons name="checkmark" size={22} color={theme.colors.primary} />}</Pressable>;
}

function AppearanceRow({ label, value, selected, onPress, last = false }: { label: string; value: AppearancePreference; selected: boolean; onPress: () => void; last?: boolean }) {
  return <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.languageRow, !last && styles.languageDivider]}><View style={styles.appearanceLabel}><Ionicons name={value === 'light' ? 'sunny-outline' : value === 'dark' ? 'moon-outline' : 'phone-portrait-outline'} size={20} color={selected ? theme.colors.accent : theme.colors.textSecondary} /><Text style={styles.languageText}>{label}</Text></View><Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? theme.colors.primary : theme.colors.textMuted} /></Pressable>;
}

const styles = createThemeStyles({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xxxl },
  signOut: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xxxl, borderRadius: theme.radius.control, backgroundColor: theme.colors.dangerSoft },
  signOutPressed: { opacity: 0.75 },
  demoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderRadius: theme.radius.card, backgroundColor: theme.colors.accentSoft },
  demoCopy: { flex: 1 },
  demoTitle: { color: theme.colors.textPrimary, fontWeight: '700' },
  demoDescription: { color: theme.colors.textSecondary, lineHeight: 19, marginTop: 3 },
  signOutText: { color: theme.colors.danger, fontSize: theme.typography.button, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  description: { color: theme.colors.textSecondary, lineHeight: 20, marginBottom: theme.spacing.xl },
  languageHeading: { color: theme.colors.textPrimary, fontWeight: '700', marginBottom: theme.spacing.sm },
  languageRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  languageDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  languageText: { color: theme.colors.textPrimary, fontSize: theme.typography.body, fontWeight: '600' }
  ,appearanceDescription: { marginTop: theme.spacing.xxl }, appearanceLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }, systemDescription: { color: theme.colors.textSecondary, fontSize: theme.typography.supporting, marginTop: theme.spacing.md }
});
