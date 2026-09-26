import type { Obligation } from '../model/accounting';

export type ReminderLeadDays = 1 | 3 | 7;
export const REMINDER_LEAD_DAYS: ReminderLeadDays[] = [1, 3, 7];
export const REMINDER_HOUR = 9;

const RESOLVED_STATUSES = new Set(['PAID', 'OVERPAID']);
const PENDING_STATUSES = new Set(['OPEN', 'PARTIALLY_PAID', 'OVERDUE']);
const KNOWN_TYPES = new Set(['RYCZALT', 'VAT', 'ZUS']);

export function isPaymentReminderEligible(payment: Obligation): boolean {
  const status = String(payment.status ?? '').trim().toUpperCase();
  return Boolean(parseLocalDate(payment.dueDate)) && KNOWN_TYPES.has(payment.title.toUpperCase()) && PENDING_STATUSES.has(status) && !RESOLVED_STATUSES.has(status);
}

/** Parse an accounting calendar date as local time; never use Date.parse on YYYY-MM-DD. */
export function parseLocalDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parts = value.split('-').map(Number);
  const year = parts[0]; const month = parts[1]; const day = parts[2];
  if (year == null || month == null || day == null) return null;
  const date = new Date(year, month - 1, day, REMINDER_HOUR, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function reminderDate(payment: Obligation, leadDays: ReminderLeadDays, now = new Date()): Date | null {
  if (!isPaymentReminderEligible(payment)) return null;
  const due = parseLocalDate(payment.dueDate);
  if (!due) return null;
  const scheduled = new Date(due);
  scheduled.setDate(scheduled.getDate() - leadDays);
  return scheduled > now ? scheduled : null;
}

export function reminderKey(profileId: number, payment: Obligation, leadDays: ReminderLeadDays, locale: 'pl' | 'en'): string | null {
  if (!payment.dueDate || !payment.period || !isPaymentReminderEligible(payment)) return null;
  return `${profileId}:${payment.period}:${payment.id}:${payment.dueDate}:${leadDays}:${locale}`;
}

export function reminderCopy(payment: Obligation, locale: 'pl' | 'en'): { title: string; body: string } {
  const labels = locale === 'pl' ? { RYCZALT: 'PPE', VAT: 'VAT', ZUS: 'ZUS' } : { RYCZALT: 'PPE', VAT: 'VAT', ZUS: 'ZUS' };
  const label = labels[payment.title.toUpperCase() as keyof typeof labels] ?? (locale === 'pl' ? 'Płatność' : 'Payment');
  return { title: locale === 'pl' ? 'Investory' : 'Investory', body: locale === 'pl' ? `${label} — zbliża się termin płatności.` : `${label} — the payment deadline is approaching.` };
}
