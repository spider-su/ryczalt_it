import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AccountingMonthProvider } from './src/navigation/AccountingMonthContext';
import { AutoApprovalProvider } from './src/settings/AutoApprovalContext';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { ACCOUNTING_DATA_SOURCE } from './src/api/config';
import { LocaleProvider, useLocale } from './src/i18n/LocaleContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return <SafeAreaProvider><LocaleProvider><AuthProvider><AppContent /></AuthProvider></LocaleProvider></SafeAreaProvider>;
}

function AppContent() {
  const { token, profileId, loading } = useAuth();
  const { ready: localeReady } = useLocale();
  if (loading || !localeReady) return null;
  if (ACCOUNTING_DATA_SOURCE === 'api' && (!token || profileId == null)) return <AuthScreen />;
  return <AutoApprovalProvider><AccountingMonthProvider><NavigationContainer><StatusBar style="dark" /><AppNavigator /></NavigationContainer></AccountingMonthProvider></AutoApprovalProvider>;
}
