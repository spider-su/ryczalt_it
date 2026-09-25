import { describe, expect, it } from 'vitest';
import { resolveThemeMode } from './appearance';

describe('appearance mode resolution', () => {
  it('defaults System to the device appearance', () => {
    expect(resolveThemeMode('system', 'light')).toBe('light');
    expect(resolveThemeMode('system', 'dark')).toBe('dark');
  });

  it('keeps explicit Light and Dark independent of the device', () => {
    expect(resolveThemeMode('light', 'dark')).toBe('light');
    expect(resolveThemeMode('dark', 'light')).toBe('dark');
  });

  it('treats an unavailable system scheme as Light', () => {
    expect(resolveThemeMode('system', null)).toBe('light');
    expect(resolveThemeMode('system', 'unspecified')).toBe('light');
  });
});
