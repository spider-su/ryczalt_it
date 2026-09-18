import { describe, expect, it } from 'vitest';
import { requireAccountingProfileId, setAccountingProfileId } from './config';

describe('accounting profile configuration', () => {
  it('requires an explicit backend-derived profile id', () => {
    setAccountingProfileId(null);
    expect(() => requireAccountingProfileId()).toThrow('profile is unavailable');
    setAccountingProfileId(7);
    expect(requireAccountingProfileId()).toBe(7);
    setAccountingProfileId(null);
  });
});
