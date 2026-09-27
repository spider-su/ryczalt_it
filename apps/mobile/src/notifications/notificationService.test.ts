import { describe, expect, it } from 'vitest';
import { REMINDER_LEAD_DAYS } from './paymentReminders';

describe('notification preferences', () => {
  it('defaults to disabled and a small supported lead-time choice', () => {
    expect(REMINDER_LEAD_DAYS).toEqual([1, 3, 7]);
  });
});
