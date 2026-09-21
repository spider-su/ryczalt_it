import * as React from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { createAccountingRepository } from '../api/config';
import { useAccountingMonth } from '../navigation/AccountingMonthContext';
import { useLocale } from '../i18n/LocaleContext';
import { t } from '../i18n';
import { theme } from '../theme/theme';
import { ErrorState, LoadingState, PrimaryButton, SegmentedControl, SettingsGroup, SettingsRow, SheetHeader, SupportingText } from '../components/ui';
import { DEFAULT_NOTIFICATION_PREFERENCES, getNotificationPreferences, permissionStatus, requestPermission, reconcilePaymentReminders, saveNotificationPreferences, cancelAllProfileReminders, type NotificationPreferences } from '../notifications/notificationService';
import * as Notifications from 'expo-notifications';
import { REMINDER_LEAD_DAYS, type ReminderLeadDays } from '../notifications/paymentReminders';
import { notificationSettingsLoadState } from '../presentation/notificationSettings';

export function NotificationSettingsScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { profileId } = useAuth();
  const { locale } = useLocale();
  const { month } = useAccountingMonth();
  const repository = React.useMemo(() => createAccountingRepository(), []);
  const [draft, setDraft] = React.useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const [saveError, setSaveError] = React.useState(false);
  const [permissionRevoked, setPermissionRevoked] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    if (!visible || profileId == null) return;
    let active = true;
    setLoaded(false); setLoadError(false); setSaveError(false);
    Promise.all([getNotificationPreferences(profileId), permissionStatus()]).then(([value, permission]) => { if (!active) return; setDraft(value); setPermissionRevoked(value.enabled && permission !== Notifications.PermissionStatus.GRANTED); }).catch(() => active && setLoadError(true)).finally(() => active && setLoaded(true));
    return () => { active = false; };
  }, [visible, profileId, retry]);
  async function save() {
    if (profileId == null || saving) return;
    setSaving(true); setSaveError(false);
    try {
      if (draft.enabled && !(await requestPermission())) { setPermissionRevoked(true); setSaveError(true); return; }
      if (!draft.enabled) await cancelAllProfileReminders(profileId);
      else {
        const monthData = await repository.getMonth(month);
        await reconcilePaymentReminders(profileId, month, monthData.obligations, draft.leadDays, locale);
      }
      // Persist only after the requested OS-side change has completed. This
      // prevents a failed fetch/schedule operation from looking saved on the
      // next visit.
      await saveNotificationPreferences(profileId, draft); setPermissionRevoked(false);
      onClose();
    } catch { setSaveError(true); } finally { setSaving(false); }
  }
  const leadOptions = REMINDER_LEAD_DAYS.map((days) => ({ value: String(days), label: t(`notifications.days${days}`) }));
  const loadState = notificationSettingsLoadState(loaded, loadError);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><SafeAreaView style={styles.sheet}><ScrollView contentContainerStyle={styles.content}><SheetHeader title={t('notifications.title')} onClose={onClose} />{loadState === 'loading' ? <LoadingState /> : loadState === 'error' ? <ErrorState title={t('notifications.loadError')} onRetry={() => setRetry((value) => value + 1)} /> : <><SupportingText>{t('notifications.description')}</SupportingText><SettingsGroup><SettingsRow title={t('notifications.paymentReminders')} description={t('notifications.paymentRemindersHint')} last><Switch value={draft.enabled} onValueChange={(enabled) => { setPermissionRevoked(false); setDraft((value) => ({ ...value, enabled })); }} disabled={saving} accessibilityLabel={t('notifications.paymentReminders')} accessibilityState={{ checked: draft.enabled, disabled: saving }} /></SettingsRow></SettingsGroup>{permissionRevoked ? <Text style={styles.error}>{t('notifications.permissionRevoked')}</Text> : null}<Text style={styles.section}>{t('notifications.leadTime')}</Text><SegmentedControl options={leadOptions} selected={String(draft.leadDays)} onSelect={(value) => setDraft((current) => ({ ...current, leadDays: Number(value) as ReminderLeadDays }))} />{saveError ? <Text style={styles.error}>{t('notifications.error')}</Text> : null}<PrimaryButton label={saving ? t('common.loading') : t('common.save')} onPress={() => { void save(); }} disabled={saving} /></>}</ScrollView></SafeAreaView></View></Modal>;
}

const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }, sheet: { maxHeight: '90%', backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large }, content: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }, section: { color: theme.colors.textPrimary, fontSize: theme.typography.rowTitle, fontWeight: '600', marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }, error: { color: theme.colors.danger, lineHeight: 20, marginTop: theme.spacing.lg } });
