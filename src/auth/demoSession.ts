export const DEMO_SESSION_TOKEN = 'investory-local-demo-session-v1';
export const DEMO_PROFILE_ID = 0;
// August is the latest fixture with complete invoice and calculation data.
// The current-month fixture is intentionally incomplete and is unsuitable as
// the initial demo period when demonstrating financial screens.
export const DEMO_ACCOUNTING_MONTH = '2026-08';

export function isDemoSession(token: string | null | undefined): boolean {
  return token === DEMO_SESSION_TOKEN;
}
