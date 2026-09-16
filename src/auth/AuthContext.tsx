import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { API_BASE_URL } from '../api/config';
import { setAccountingAuthToken } from '../api/config';

const TOKEN_KEY = 'investory.authToken';
const LOGIN_PATH = process.env.EXPO_PUBLIC_AUTH_LOGIN_PATH ?? '/api/v1/auth/login';
type AuthContextValue = { token: string | null; loading: boolean; error: string | null; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { SecureStore.getItemAsync(TOKEN_KEY).then((value) => { setToken(value); setAccountingAuthToken(value); }).catch(() => undefined).finally(() => setLoading(false)); }, []);
  async function signIn(email: string, password: string) {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}${LOGIN_PATH}`, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!response.ok) throw new Error(response.status === 401 ? 'Email or password is incorrect' : `Sign in failed (HTTP ${response.status})`);
      const body = (await response.json()) as { token?: string; accessToken?: string };
      const nextToken = body.token ?? body.accessToken;
      if (!nextToken) throw new Error('Sign-in response did not contain an access token');
      await SecureStore.setItemAsync(TOKEN_KEY, nextToken); setAccountingAuthToken(nextToken); setToken(nextToken);
    } catch (reason) { const message = reason instanceof Error ? reason.message : 'Sign in failed'; setError(message); throw new Error(message); }
  }
  async function signOut() { await SecureStore.deleteItemAsync(TOKEN_KEY); setAccountingAuthToken(null); setToken(null); }
  return <AuthContext.Provider value={{ token, loading, error, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
