import { describe, expect, it } from 'vitest';
import { createAccountingApi, createAccountingRepository, isDemoMode, requireAccountingProfileId, setAccountingProfileId, setDemoMode } from './config';

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
});
