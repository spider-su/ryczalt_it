import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { PaymentLine } from '../model/accounting';
import type { UiLocale } from '../i18n';
import { isPaymentReminderEligible, reminderCopy, reminderDate, reminderKey, type ReminderLeadDays } from './paymentReminders';

const preferenceKey = (profileId: number) => `investory.notifications.preferences.${profileId}`;
const scheduleKey = (profileId: number) => `investory.notifications.schedules.${profileId}`;
const CHANNEL_ID = 'payment-reminders';
export type NotificationPreferences = { enabled: boolean; leadDays: ReminderLeadDays };
type ScheduleRecord = { id: string; period: string; key: string };

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = { enabled: false, leadDays: 3 };

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

export async function permissionStatus(): Promise<Notifications.PermissionStatus> {
  return (await Notifications.getPermissionsAsync()).status;
}

export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function getNotificationPreferences(profileId: number): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(preferenceKey(profileId));
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    const leadDays = parsed.leadDays === 1 || parsed.leadDays === 3 || parsed.leadDays === 7 ? parsed.leadDays : DEFAULT_NOTIFICATION_PREFERENCES.leadDays;
    return { enabled: parsed.enabled === true, leadDays };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function saveNotificationPreferences(profileId: number, preferences: NotificationPreferences): Promise<void> {
  await AsyncStorage.setItem(preferenceKey(profileId), JSON.stringify(preferences));
}

export async function cancelAllProfileReminders(profileId: number): Promise<void> {
  const records = await readRecords(profileId);
  await Promise.all(records.map((record) => Notifications.cancelScheduledNotificationAsync(record.id)));
  await AsyncStorage.removeItem(scheduleKey(profileId));
}

/** Reconciles only the supplied accounting period; it never cancels reminders for unseen months. */
export async function reconcilePaymentReminders(profileId: number, period: string, payments: PaymentLine[], leadDays: ReminderLeadDays, locale: UiLocale, now = new Date()): Promise<void> {
  if ((await permissionStatus()) !== Notifications.PermissionStatus.GRANTED) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: 'Payment reminders', importance: Notifications.AndroidImportance.DEFAULT });
  const records = await readRecords(profileId);
  const scheduledIds = new Set((await Notifications.getAllScheduledNotificationsAsync()).map((item) => item.identifier));
  const current = records.filter((record) => record.period === period);
  const desired = new Map<string, PaymentLine>();
  for (const payment of payments) {
    const key = reminderKey(profileId, payment, leadDays, locale);
    if (key && reminderDate(payment, leadDays, now)) desired.set(key, payment);
  }
  const kept: ScheduleRecord[] = records.filter((record) => record.period !== period);
  for (const record of current) {
    if (!desired.has(record.key) || !scheduledIds.has(record.id)) await Notifications.cancelScheduledNotificationAsync(record.id);
    else kept.push(record);
  }
  for (const [key, payment] of desired) {
    if (kept.some((record) => record.key === key)) continue;
    const date = reminderDate(payment, leadDays, now);
    if (!date) continue;
    const copy = reminderCopy(payment, locale);
    const id = await Notifications.scheduleNotificationAsync({ identifier: key, content: { title: copy.title, body: copy.body, data: { kind: 'payment-reminder', route: 'Payments', profileId } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID } });
    kept.push({ id, period, key });
  }
  await AsyncStorage.setItem(scheduleKey(profileId), JSON.stringify(kept));
}

async function readRecords(profileId: number): Promise<ScheduleRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(scheduleKey(profileId));
    const records = raw ? JSON.parse(raw) : [];
    return Array.isArray(records) ? records.filter((record): record is ScheduleRecord => typeof record?.id === 'string' && typeof record?.period === 'string' && typeof record?.key === 'string') : [];
  } catch {
    return [];
  }
}
