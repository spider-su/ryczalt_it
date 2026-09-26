import { describe, expect, it } from 'vitest';
import { createAccountingApi, createAccountingRepository, initialAccountingMonth, isDemoMode, requireAccountingProfileId, requireApiBaseUrl, setAccountingProfileId, setDemoMode } from './config';

describe('accounting profile configuration', () => {
  it('requires an explicit backend-derived profile id', () => {
    setAccountingProfileId(null);
    expect(() => requireAccountingProfileId()).toThrow('profile is unavailable');
    setAccountingProfileId(7);
    expect(requireAccountingProfileId()).toBe(7);
    setAccountingProfileId(null);
  });

  it('uses fixtures and refuses API construction in demo mode', () => {
    setDemoMode(true);
    expect(isDemoMode()).toBe(true);
    expect(createAccountingRepository().constructor.name).toBe('MockAccountingRepository');
    expect(() => createAccountingApi()).toThrow('require the API data source');
    setDemoMode(false);
    expect(isDemoMode()).toBe(false);
  });

  it('starts demo and mock data sources on the latest populated fixture month', () => {
    expect(initialAccountingMonth('api', true, '2026-09', '2026-08')).toBe('2026-08');
    expect(initialAccountingMonth('mock', false, '2026-09', '2026-08')).toBe('2026-08');
    expect(initialAccountingMonth('api', false, '2026-09', '2026-08')).toBe('2026-09');
  });

  it('does not silently choose a deployed API when live configuration is missing', () => {
    expect(() => requireApiBaseUrl()).toThrow('API URL is required');
  });
});
