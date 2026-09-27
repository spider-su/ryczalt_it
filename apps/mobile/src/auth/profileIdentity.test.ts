import { describe, expect, it } from 'vitest';
import { profileIdentityFromResponse } from './profileIdentity';

describe('backend-derived profile identity', () => {
  it('accepts the current profile returned by the backend', () => {
    expect(profileIdentityFromResponse({ currentProfile: { id: 7, name: 'Accounting', role: 'OWNER' } })).toEqual({
      id: 7, name: 'Accounting', role: 'OWNER'
    });
  });

  it('rejects a missing or invalid profile id', () => {
    expect(() => profileIdentityFromResponse({ currentProfile: { id: 0 } })).toThrow('profile_unavailable');
    expect(() => profileIdentityFromResponse({ currentProfile: { id: '1' } })).toThrow('profile_unavailable');
    expect(() => profileIdentityFromResponse({})).toThrow('profile_unavailable');
  });
});
