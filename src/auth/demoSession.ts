export const DEMO_SESSION_TOKEN = 'investory-local-demo-session-v1';
export const DEMO_PROFILE_ID = 0;
export const DEMO_ACCOUNTING_MONTH = '2026-07';

export function isDemoSession(token: string | null | undefined): boolean {
  return token === DEMO_SESSION_TOKEN;
}
