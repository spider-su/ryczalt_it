import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { DEFAULT_UI_LOCALE, setActiveLocale, type UiLocale } from './index';

export const LOCALE_STORAGE_KEY = 'investory.ui.locale';
type LocaleContextValue = { locale: UiLocale; ready: boolean; setLocale: (locale: UiLocale) => Promise<void> };
const LocaleContext = createContext<LocaleContextValue | null>(null);
export function resolveInitialLocale(saved: string | null, deviceLocale?: string | null): UiLocale { if (saved === 'pl' || saved === 'en') return saved; return deviceLocale?.toLowerCase().startsWith('en') ? 'en' : DEFAULT_UI_LOCALE; }
export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<UiLocale>(DEFAULT_UI_LOCALE); const [ready, setReady] = useState(false);
  useEffect(() => { const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale; AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((saved) => { const next = resolveInitialLocale(saved, deviceLocale); setActiveLocale(next); setLocaleState(next); }).catch(() => undefined).finally(() => setReady(true)); }, []);
  const value = useMemo<LocaleContextValue>(() => ({ locale, ready, setLocale: async (next) => { setActiveLocale(next); setLocaleState(next); await AsyncStorage.setItem(LOCALE_STORAGE_KEY, next); } }), [locale, ready]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useLocale(): LocaleContextValue { const value = useContext(LocaleContext); if (!value) throw new Error('useLocale must be used inside LocaleProvider'); return value; }
