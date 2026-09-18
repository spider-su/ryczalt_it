import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { API_BASE_URL, setAccountingAuthFailureHandler, setAccountingAuthToken, setAccountingProfileId } from '../api/config';
import { DEFAULT_REQUEST_TIMEOUT_MS } from '../api/client';
import { authErrorForFailure, authErrorForStatus, type AuthErrorCode } from './authErrors';
import { profileIdentityFromResponse, type ProfileIdentity } from './profileIdentity';

const TOKEN_KEY = 'investory.authToken';
const PROFILE_ID_KEY = 'investory.accountingProfileId';
const LOGIN_PATH = process.env.EXPO_PUBLIC_AUTH_LOGIN_PATH ?? '/api/v1/auth/login';
const CURRENT_PROFILE_PATH = '/api/v1/auth/me';
type AuthContextValue = { token: string | null; profileId: number | null; loading: boolean; error: AuthErrorCode | null; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const invalidateSession = useCallback(async () => { await SecureStore.deleteItemAsync(TOKEN_KEY); await SecureStore.deleteItemAsync(PROFILE_ID_KEY); setAccountingAuthToken(null); setAccountingProfileId(null); setToken(null); setProfileId(null); }, []);
  async function resolveProfile(nextToken: string): Promise<ProfileIdentity> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE_URL}${CURRENT_PROFILE_PATH}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${nextToken}` }, signal: controller.signal });
      if (!response.ok) throw new Error(authErrorForStatus(response.status));
      return profileIdentityFromResponse(await response.json());
    } finally { clearTimeout(timeout); }
  }
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const value = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!value) return;
        const profile = await resolveProfile(value);
        if (cancelled) return;
        await SecureStore.setItemAsync(PROFILE_ID_KEY, String(profile.id));
        setAccountingAuthToken(value); setAccountingProfileId(profile.id); setToken(value); setProfileId(profile.id);
      } catch (reason) {
        if (!cancelled) { await invalidateSession(); setError(authErrorForFailure(reason)); }
      } finally { if (!cancelled) setLoading(false); }
    }
    void restore();
    return () => { cancelled = true; };
  }, [invalidateSession]);
  useEffect(() => { setAccountingAuthFailureHandler(() => { void invalidateSession(); }); return () => setAccountingAuthFailureHandler(null); }, [invalidateSession]);
  async function signIn(email: string, password: string) {
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE_URL}${LOGIN_PATH}`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), signal: controller.signal });
      if (!response.ok) throw new Error(authErrorForStatus(response.status));
      const body = (await response.json()) as { token?: string; accessToken?: string };
      const nextToken = body.token ?? body.accessToken;
      if (!nextToken) throw new Error('invalid_response');
      const profile = await resolveProfile(nextToken);
      await SecureStore.setItemAsync(TOKEN_KEY, nextToken); await SecureStore.setItemAsync(PROFILE_ID_KEY, String(profile.id));
      setAccountingAuthToken(nextToken); setAccountingProfileId(profile.id); setToken(nextToken); setProfileId(profile.id);
    } catch (reason) { const code = authErrorForFailure(reason); setError(code); throw new Error(code); } finally { clearTimeout(timeout); }
  }
  async function signOut() { await invalidateSession(); }
  return <AuthContext.Provider value={{ token, profileId, loading, error, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
