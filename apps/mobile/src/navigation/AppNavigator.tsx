import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from '../screens/HomeScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { PaymentsScreen } from '../screens/PaymentsScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { ActionLauncherScreen } from '../screens/ActionLauncherScreen';
import { theme, useTheme } from '../theme/theme';
import { t } from '../i18n';
import { useLocale } from '../i18n/LocaleContext';
import { getTabBarLayout } from './tabBarLayout';

export type AppTabParamList = {
  Home: undefined;
  Documents: { direction?: 'SALE' | 'PURCHASE' } | undefined;
  Actions: undefined;
  Payments: undefined;
  More: undefined;
};
const Tab = createBottomTabNavigator<AppTabParamList>();
export const navigationRef = createNavigationContainerRef<AppTabParamList>();

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Documents: 'documents-outline',
  Actions: 'add',
  Payments: 'card-outline',
  More: 'ellipsis-horizontal'
};

export function AppNavigator() {
  useTheme();
  useLocale();
  const insets = useSafeAreaInsets();
  const tabBarLayout = getTabBarLayout(insets.bottom);
  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: -0.15
        },
        tabBarItemStyle: { minHeight: 56 },
        tabBarStyle: {
          ...tabBarLayout,
          borderTopWidth: 1,
          borderTopColor: theme.colors.borderSubtle,
          backgroundColor: theme.colors.surfaceElevated
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name] ?? 'ellipse-outline'} color={color} size={size} />
        )
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('app.home') }} />
      <Tab.Screen name="Documents" component={DocumentsScreen} options={{ title: t('app.invoices') }} />
      <Tab.Screen
        name="Actions"
        component={ActionLauncherScreen}
        options={{
          title: '+',
          tabBarShowLabel: false,
          tabBarButton: ({ onPress, accessibilityState }) => (
            <Pressable
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={t('actions.title')}
              accessibilityState={accessibilityState}
              style={({ pressed }) => ({ alignItems: 'center', justifyContent: 'center', width: 56, height: 56, marginTop: -14, borderRadius: 28, backgroundColor: pressed ? theme.colors.accentPressed : theme.colors.primary })}
            >
              <Ionicons name="add" size={28} color={theme.colors.onAccent} />
            </Pressable>
          )
        }}
      />
      <Tab.Screen name="Payments" component={PaymentsScreen} options={{ title: t('app.settlements') }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: t('app.more') }} />
    </Tab.Navigator>
  );
}
