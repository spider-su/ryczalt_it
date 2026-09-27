export type ProfileIdentity = { id: number; name: string; role: string };

export function profileIdentityFromResponse(body: unknown): ProfileIdentity {
  if (!body || typeof body !== 'object') throw new Error('profile_unavailable');
  const currentProfile = (body as { currentProfile?: unknown }).currentProfile;
  if (!currentProfile || typeof currentProfile !== 'object') throw new Error('profile_unavailable');
  const profile = currentProfile as { id?: unknown; name?: unknown; role?: unknown };
  if (typeof profile.id !== 'number' || !Number.isSafeInteger(profile.id) || profile.id <= 0) {
    throw new Error('profile_unavailable');
  }
  return {
    id: profile.id,
    name: typeof profile.name === 'string' ? profile.name : '',
    role: typeof profile.role === 'string' ? profile.role : ''
  };
}
