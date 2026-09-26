import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Platform } from "react-native";
import {
  requireApiBaseUrl,
  setAccountingAuthFailureHandler,
  setAccountingAuthToken,
  setAccountingProfileId,
  setDemoMode,
} from "../api/config";
import { AUTH_REQUEST_TIMEOUT_MS, HttpClient } from "../api/client";
import { authErrorForFailure, type AuthErrorCode } from "./authErrors";
import {
  profileIdentityFromResponse,
  type ProfileIdentity,
} from "./profileIdentity";
import { cancelAllProfileReminders } from "../notifications/notificationService";
import { resetDemoAccountingState } from "../data/mockAccountingRepository";
import {
  DEMO_PROFILE_ID,
  DEMO_SESSION_TOKEN,
  isDemoSession,
} from "./demoSession";
import {
  authenticateForBiometricLogin,
  biometricLoginAvailable,
  BIOMETRIC_ENABLED_KEY,
} from "./biometric";

const TOKEN_KEY = "investory.authToken";
const PROFILE_ID_KEY = "investory.accountingProfileId";
const LOGIN_PATH =
  process.env.EXPO_PUBLIC_AUTH_LOGIN_PATH ?? "/api/v1/auth/login";
const CURRENT_PROFILE_PATH = "/api/v1/auth/me";
const INVITATION_ACCEPT_PATH = "/api/v1/auth/invitations";
function publicAuthClient(): HttpClient {
  return new HttpClient({
    baseUrl: requireApiBaseUrl(),
    timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
  });
}
type AuthContextValue = {
  token: string | null;
  profileId: number | null;
  isDemo: boolean;
  loading: boolean;
  error: AuthErrorCode | null;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  activateAccount: (token: string, password: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  enableBiometricLogin: () => Promise<boolean>;
  disableBiometricLogin: () => Promise<void>;
  startDemo: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

// SecureStore is native-only. Expo web uses the existing browser-backed
// AsyncStorage adapter so local development can exercise the same session flow.
const sessionStore = {
  get: (key: string) =>
    Platform.OS === "web"
      ? AsyncStorage.getItem(key)
      : SecureStore.getItemAsync(key),
  set: (
    key: string,
    value: string,
    options?: SecureStore.SecureStoreOptions,
  ) =>
    Platform.OS === "web"
      ? AsyncStorage.setItem(key, value)
      : SecureStore.setItemAsync(key, value, options),
  delete: (key: string) =>
    Platform.OS === "web"
      ? AsyncStorage.removeItem(key)
      : SecureStore.deleteItemAsync(key),
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const profileIdRef = useRef<number | null>(null);
  profileIdRef.current = profileId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const invalidateSession = useCallback(async () => {
    const activeProfileId = profileIdRef.current;
    if (activeProfileId != null)
      await cancelAllProfileReminders(activeProfileId).catch(() => undefined);
    await sessionStore.delete(TOKEN_KEY);
    await sessionStore.delete(PROFILE_ID_KEY);
    setDemoMode(false);
    setIsDemo(false);
    setAccountingAuthToken(null);
    setAccountingProfileId(null);
    setToken(null);
    setProfileId(null);
  }, []);
  async function resolveProfile(nextToken: string): Promise<ProfileIdentity> {
    try {
      return profileIdentityFromResponse(
        await publicAuthClient().get(CURRENT_PROFILE_PATH, {
          headers: { Authorization: `Bearer ${nextToken}` },
        }),
      );
    } catch (reason) {
      const code = authErrorForFailure(reason);
      throw new Error(code, { cause: reason });
    }
  }
  useEffect(() => {
    void biometricLoginAvailable()
      .then(setBiometricAvailable)
      .catch(() => setBiometricAvailable(false));
    void sessionStore
      .get(BIOMETRIC_ENABLED_KEY)
      .then((value) => setBiometricEnabled(value === "true"))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const biometricEnabledOnDevice =
          (await sessionStore.get(BIOMETRIC_ENABLED_KEY)) === "true";
        if (
          biometricEnabledOnDevice &&
          !(await authenticateForBiometricLogin())
        )
          return;
        const value = await sessionStore.get(TOKEN_KEY);
        if (!value) return;
        if (isDemoSession(value)) {
          if (cancelled) return;
          setDemoMode(true);
          setIsDemo(true);
          setAccountingAuthToken(null);
          setAccountingProfileId(DEMO_PROFILE_ID);
          setToken(value);
          setProfileId(DEMO_PROFILE_ID);
          return;
        }
        const profile = await resolveProfile(value);
        if (cancelled) return;
        await sessionStore.set(PROFILE_ID_KEY, String(profile.id));
        setDemoMode(false);
        setIsDemo(false);
        setAccountingAuthToken(value);
        setAccountingProfileId(profile.id);
        setToken(value);
        setProfileId(profile.id);
      } catch (reason) {
        if (!cancelled) {
          await invalidateSession();
          setError(authErrorForFailure(reason));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [invalidateSession]);
  useEffect(() => {
    setAccountingAuthFailureHandler(() => {
      void invalidateSession();
    });
    return () => setAccountingAuthFailureHandler(null);
  }, [invalidateSession]);
  async function signIn(email: string, password: string) {
    setError(null);
    setDemoMode(false);
    setIsDemo(false);
    try {
      const body = await publicAuthClient().post<{
        token?: string;
        accessToken?: string;
      }>(LOGIN_PATH, { email, password });
      const nextToken = body.token ?? body.accessToken;
      if (!nextToken) throw new Error("invalid_response");
      const profile = await resolveProfile(nextToken);
      await sessionStore.set(TOKEN_KEY, nextToken);
      await sessionStore.set(PROFILE_ID_KEY, String(profile.id));
      setAccountingAuthToken(nextToken);
      setAccountingProfileId(profile.id);
      setToken(nextToken);
      setProfileId(profile.id);
    } catch (reason) {
      const code = authErrorForFailure(reason);
      setError(code);
      throw new Error(code, { cause: reason });
    }
  }
  async function activateAccount(invitationToken: string, password: string) {
    setError(null);
    try {
      await publicAuthClient().postVoid(
        `${INVITATION_ACCEPT_PATH}/${encodeURIComponent(invitationToken)}/accept`,
        { password },
        { timeoutMs: AUTH_REQUEST_TIMEOUT_MS },
      );
    } catch (reason) {
      const code = authErrorForFailure(reason);
      setError(code);
      throw new Error(code, { cause: reason });
    }
  }
  async function unlockWithBiometrics() {
    setError(null);
    const value = await sessionStore.get(TOKEN_KEY);
    if (
      !value ||
      isDemoSession(value) ||
      !(await authenticateForBiometricLogin())
    )
      return false;
    try {
      const profile = await resolveProfile(value);
      await sessionStore.set(PROFILE_ID_KEY, String(profile.id));
      setAccountingAuthToken(value);
      setAccountingProfileId(profile.id);
      setToken(value);
      setProfileId(profile.id);
      return true;
    } catch (reason) {
      setError(authErrorForFailure(reason));
      return false;
    }
  }
  async function enableBiometricLogin() {
    if (!biometricAvailable || !(await authenticateForBiometricLogin()))
      return false;
    if (token && !isDemoSession(token) && Platform.OS !== "web")
      await sessionStore.set(TOKEN_KEY, token, { requireAuthentication: true });
    await sessionStore.set(BIOMETRIC_ENABLED_KEY, "true");
    setBiometricEnabled(true);
    return true;
  }
  async function disableBiometricLogin() {
    await sessionStore.delete(BIOMETRIC_ENABLED_KEY);
    setBiometricEnabled(false);
  }
  async function startDemo() {
    resetDemoAccountingState();
    setError(null);
    await sessionStore.set(TOKEN_KEY, DEMO_SESSION_TOKEN);
    await sessionStore.set(PROFILE_ID_KEY, String(DEMO_PROFILE_ID));
    setDemoMode(true);
    setIsDemo(true);
    setAccountingAuthToken(null);
    setAccountingProfileId(DEMO_PROFILE_ID);
    setToken(DEMO_SESSION_TOKEN);
    setProfileId(DEMO_PROFILE_ID);
  }
  async function signOut() {
    await invalidateSession();
    await disableBiometricLogin();
  }
  return (
    <AuthContext.Provider
      value={{
        token,
        profileId,
        isDemo,
        loading,
        error,
        biometricAvailable,
        biometricEnabled,
        signIn,
        activateAccount,
        unlockWithBiometrics,
        enableBiometricLogin,
        disableBiometricLogin,
        startDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
