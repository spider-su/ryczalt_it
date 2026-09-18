import * as React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { createAccountingRepository } from '../api/config';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { useLocale } from '../i18n/LocaleContext';
import { t } from '../i18n';
import { theme } from '../theme/theme';
import { DEFAULT_NOTIFICATION_PREFERENCES, getNotificationPreferences, requestPermission, reconcilePaymentReminders, saveNotificationPreferences, cancelAllProfileReminders, type NotificationPreferences } from '../notifications/notificationService';
import { REMINDER_LEAD_DAYS, type ReminderLeadDays } from '../notifications/paymentReminders';

export function NotificationSettingsScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profileId } = useAuth();
  const { locale } = useLocale();
  const { month } = useAccountingMonth();
  const repository = React.useMemo(() => createAccountingRepository(), []);
  const [draft, setDraft] = React.useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    if (!visible || profileId == null) return;
    let active = true;
    setLoaded(false); setError(false);
    getNotificationPreferences(profileId).then((value) => active && setDraft(value)).catch(() => active && setError(true)).finally(() => active && setLoaded(true));
    return () => { active = false; };
  }, [visible, profileId]);
  async function save() {
    if (profileId == null || saving) return;
    setSaving(true); setError(false);
    try {
      if (draft.enabled && !(await requestPermission())) { setError(true); return; }
      await saveNotificationPreferences(profileId, draft);
      if (!draft.enabled) await cancelAllProfileReminders(profileId);
      else {
        const monthData = await repository.getMonth(month);
        await reconcilePaymentReminders(profileId, month, monthData.payments, draft.leadDays, locale);
      }
      onClose();
    } catch { setError(true); } finally { setSaving(false); }
  }
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><SafeAreaView style={styles.sheet}><ScrollView contentContainerStyle={styles.content}><View style={styles.header}><Text style={styles.title}>{t('notifications.title')}</Text><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}><Text style={styles.close}>×</Text></Pressable></View>{!loaded ? <ActivityIndicator color={theme.colors.primary} /> : <><Text style={styles.description}>{t('notifications.description')}</Text><View style={styles.row}><View style={styles.copy}><Text style={styles.label}>{t('notifications.paymentReminders')}</Text><Text style={styles.hint}>{t('notifications.paymentRemindersHint')}</Text></View><Switch value={draft.enabled} onValueChange={(enabled) => setDraft((value) => ({ ...value, enabled }))} accessibilityLabel={t('notifications.paymentReminders')} /></View><Text style={styles.section}>{t('notifications.leadTime')}</Text><View style={styles.options}>{REMINDER_LEAD_DAYS.map((days) => <Pressable key={days} onPress={() => setDraft((value) => ({ ...value, leadDays: days as ReminderLeadDays }))} accessibilityRole="radio" accessibilityState={{ selected: draft.leadDays === days }} style={[styles.option, draft.leadDays === days && styles.selected]}><Text style={[styles.optionText, draft.leadDays === days && styles.selectedText]}>{t(`notifications.days${days}`)}</Text></Pressable>)}</View>{error && <Text style={styles.error}>{t('notifications.error')}</Text>}<Pressable onPress={() => void save()} disabled={saving} accessibilityRole="button" accessibilityState={{ busy: saving }} style={[styles.save, saving && styles.disabled]}><Text style={styles.saveText}>{saving ? t('common.loading') : t('common.save')}</Text></Pressable></>}</ScrollView></SafeAreaView></View></Modal>;
}

const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }, sheet: { maxHeight: '90%', backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large }, content: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800' }, close: { color: theme.colors.textMuted, fontSize: 30, lineHeight: 30 }, description: { color: theme.colors.textSecondary, lineHeight: 21, marginTop: theme.spacing.lg }, row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.borderSubtle, marginTop: theme.spacing.xl }, copy: { flex: 1 }, label: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' }, hint: { color: theme.colors.textSecondary, lineHeight: 19, marginTop: 4 }, section: { color: theme.colors.textPrimary, fontWeight: '800', marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }, options: { gap: theme.spacing.sm }, option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.control, borderWidth: 1, borderColor: theme.colors.borderSubtle }, selected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceSecondary }, optionText: { color: theme.colors.textPrimary, fontWeight: '700' }, selectedText: { color: theme.colors.accent }, error: { color: theme.colors.danger, lineHeight: 20, marginTop: theme.spacing.lg }, save: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.radius.control, marginTop: theme.spacing.xl }, disabled: { opacity: 0.6 }, saveText: { color: theme.colors.onAccent, fontWeight: '800', fontSize: 16 } });
