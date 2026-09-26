import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AccountingMonthProvider } from './src/navigation/AccountingMonthContext';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { ACCOUNTING_DATA_SOURCE } from './src/api/config';
import { LocaleProvider, useLocale } from './src/i18n/LocaleContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Component, useEffect, type ErrorInfo, type PropsWithChildren } from 'react';
import { navigationRef } from './src/navigation/AppNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from './src/i18n';
import { ThemeProvider, useTheme, theme } from './src/theme/theme';
import { WebAppMetadata } from './src/components/WebAppMetadata';
import { captureAppException, initializeCrashMonitoring } from './src/monitoring/sentry';

initializeCrashMonitoring();

export default function App() {
  return <AppErrorBoundary><SafeAreaProvider><ThemeProvider><LocaleProvider><AuthProvider><WebAppMetadata /><AppContent /></AuthProvider></LocaleProvider></ThemeProvider></SafeAreaProvider></AppErrorBoundary>;
}

class AppErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    captureAppException(error, { componentStack: info.componentStack });
    if (__DEV__) console.error('Investory UI error', error.message, info.componentStack);
  }
  render() {
    if (this.state.failed) return <SafeAreaProvider><Text style={{ flex: 1, textAlign: 'center', textAlignVertical: 'center', padding: 24 }}>Investory could not display this screen. Please restart the app.</Text></SafeAreaProvider>;
    return this.props.children;
  }
}

let pendingPaymentNavigationProfileId: number | null = null;
function AppContent() {
  const { token, profileId, isDemo, loading } = useAuth();
  const { ready: localeReady } = useLocale();
  const { mode } = useTheme();
  useEffect(() => {
    if (loading || !localeReady) return;
    if (ACCOUNTING_DATA_SOURCE === 'api' && !isDemo && (!token || profileId == null)) { pendingPaymentNavigationProfileId = null; return; }
    const openPayments = (response: Notifications.NotificationResponse | null | undefined) => {
      const data = response?.notification.request.content.data as { route?: string; profileId?: number } | undefined;
      if (data?.route !== 'Payments' || data.profileId !== profileId) return;
      if (navigationRef.isReady()) navigationRef.navigate('Payments');
      else pendingPaymentNavigationProfileId = profileId;
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openPayments);
    void Notifications.getLastNotificationResponseAsync().then(openPayments).catch(() => undefined);
    return () => subscription.remove();
  }, [loading, localeReady, profileId, token, isDemo]);
  if (loading || !localeReady) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}><ActivityIndicator color={theme.colors.primary} /><Text style={{ color: theme.colors.textSecondary }}>{t('startup.loading')}</Text></View></SafeAreaView>;
  if (ACCOUNTING_DATA_SOURCE === 'api' && !isDemo && (!token || profileId == null)) return <AuthScreen />;
  return <AccountingMonthProvider><NavigationContainer ref={navigationRef} onReady={() => { if (pendingPaymentNavigationProfileId === profileId) { pendingPaymentNavigationProfileId = null; navigationRef.navigate('Payments'); } }}><StatusBar style={mode === 'dark' ? 'light' : 'dark'} />{Platform.OS === 'android' ? <NavigationBar style={mode === 'dark' ? 'dark' : 'light'} /> : null}<AppNavigator /></NavigationContainer></AccountingMonthProvider>;
}
