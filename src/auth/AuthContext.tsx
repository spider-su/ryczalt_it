import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { API_BASE_URL, setAccountingAuthFailureHandler, setAccountingAuthToken } from '../api/config';
import { DEFAULT_REQUEST_TIMEOUT_MS } from '../api/client';
import { authErrorForFailure, authErrorForStatus, type AuthErrorCode } from './authErrors';

const TOKEN_KEY = 'investory.authToken';
const LOGIN_PATH = process.env.EXPO_PUBLIC_AUTH_LOGIN_PATH ?? '/api/v1/auth/login';
type AuthContextValue = { token: string | null; loading: boolean; error: AuthErrorCode | null; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const invalidateSession = useCallback(async () => { await SecureStore.deleteItemAsync(TOKEN_KEY); setAccountingAuthToken(null); setToken(null); }, []);
  useEffect(() => { SecureStore.getItemAsync(TOKEN_KEY).then((value) => { setToken(value); setAccountingAuthToken(value); }).catch(() => undefined).finally(() => setLoading(false)); }, []);
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
      await SecureStore.setItemAsync(TOKEN_KEY, nextToken); setAccountingAuthToken(nextToken); setToken(nextToken);
    } catch (reason) { const code = authErrorForFailure(reason); setError(code); throw new Error(code); } finally { clearTimeout(timeout); }
  }
  async function signOut() { await invalidateSession(); }
  return <AuthContext.Provider value={{ token, loading, error, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
