import { describe, expect, it } from 'vitest';
import { notificationSettingsLoadState } from './notificationSettings';

describe('notification settings load state', () => {
  it('does not expose the editable form before authoritative settings load', () => {
    expect(notificationSettingsLoadState(false, false)).toBe('loading');
    expect(notificationSettingsLoadState(true, true)).toBe('error');
    expect(notificationSettingsLoadState(true, false)).toBe('ready');
  });
});
