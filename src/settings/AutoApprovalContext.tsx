import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

const STORAGE_KEY = 'investory.autoApprovalSettings';
export type AutoApprovalSettings = { enabled: boolean; maxAmount: string; trustedCategories: string[] };
const DEFAULT_SETTINGS: AutoApprovalSettings = { enabled: false, maxAmount: '0', trustedCategories: [] };

const SettingsContext = createContext<{ settings: AutoApprovalSettings; ready: boolean; update: (settings: AutoApprovalSettings) => Promise<void> } | null>(null);

export function AutoApprovalProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((value) => { if (value) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(value) }); }).catch(() => undefined).finally(() => setReady(true)); }, []);
  async function update(next: AutoApprovalSettings) { setSettings(next); await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  return <SettingsContext.Provider value={{ settings, ready, update }}>{children}</SettingsContext.Provider>;
}

export function useAutoApproval() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useAutoApproval must be used inside AutoApprovalProvider');
  return value;
}
