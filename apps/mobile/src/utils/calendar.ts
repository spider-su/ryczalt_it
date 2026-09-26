export const MIN_ACCOUNTING_MONTH = '2026-01';

export function currentLocalAccountingMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isAccountingMonthAllowed(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month >= MIN_ACCOUNTING_MONTH;
}

export function clampAccountingMonth(month: string): string {
  return isAccountingMonthAllowed(month) ? month : MIN_ACCOUNTING_MONTH;
}
