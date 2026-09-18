import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AccountingMonthProvider } from './src/navigation/AccountingMonthContext';
import { AutoApprovalProvider } from './src/settings/AutoApprovalContext';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { ACCOUNTING_DATA_SOURCE } from './src/api/config';
import { LocaleProvider } from './src/i18n/LocaleContext';

export default function App() {
  return (
    <LocaleProvider><AuthProvider><AppContent /></AuthProvider></LocaleProvider>
  );
}

function AppContent() {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (ACCOUNTING_DATA_SOURCE === 'api' && !token) return <AuthScreen />;
  return <AutoApprovalProvider><AccountingMonthProvider><NavigationContainer><StatusBar style="dark" /><AppNavigator /></NavigationContainer></AccountingMonthProvider></AutoApprovalProvider>;
}
