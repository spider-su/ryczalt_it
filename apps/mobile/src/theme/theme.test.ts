import { describe, expect, it, vi } from 'vitest';
import { resolveThemeMode } from './appearance';
vi.mock('expo-system-ui', () => ({ setBackgroundColorAsync: vi.fn() }));
import { createThemeStyles, theme } from './theme';

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

describe('theme token styles', () => {
  it('reads semantic colors after the active palette changes', () => {
    const original = theme.colors.textPrimary;
    const styles = createThemeStyles({ action: { backgroundColor: original } });
    const before = styles.action;
    try {
      Object.assign(theme.colors, { textPrimary: '#123456' });
      expect(styles.action).not.toBe(before);
      expect(styles.action.backgroundColor).toBe('#123456');
    } finally {
      Object.assign(theme.colors, { textPrimary: original });
    }
  });
});
