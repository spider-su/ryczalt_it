import { describe, expect, it } from 'vitest';
import { DEMO_ACCOUNTING_MONTH, DEMO_PROFILE_ID, DEMO_SESSION_TOKEN, isDemoSession } from './demoSession';

describe('local demo session', () => {
  it('uses a distinct local-only marker and non-server profile id', () => {
    expect(isDemoSession(DEMO_SESSION_TOKEN)).toBe(true);
    expect(isDemoSession('server-issued-token')).toBe(false);
    expect(DEMO_PROFILE_ID).toBe(0);
    expect(DEMO_ACCOUNTING_MONTH).toBe('2026-09');
  });
});
