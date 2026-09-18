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
import { theme } from '../theme/theme';
import { t } from '../i18n';
import { useLocale } from '../i18n/LocaleContext';
import { getTabBarLayout } from './tabBarLayout';

const Tab = createBottomTabNavigator();

export type AppTabParamList = {
  Home: undefined;
  Documents: undefined;
  Actions: undefined;
  Payments: undefined;
  More: undefined;
};
export const navigationRef = createNavigationContainerRef<AppTabParamList>();

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Documents: 'documents-outline',
  Actions: 'add',
  Payments: 'card-outline',
  More: 'ellipsis-horizontal'
};

export function AppNavigator() {
  useLocale();
  const insets = useSafeAreaInsets();
  const tabBarLayout = getTabBarLayout(insets.bottom);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700'
        },
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
          tabBarButton: ({ onPress }) => (
            <Pressable
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={t('actions.title')}
              style={{ alignItems: 'center', justifyContent: 'center', width: 56, height: 56, marginTop: -14, borderRadius: 28, backgroundColor: theme.colors.primary }}
            >
              <Ionicons name="add" size={30} color={theme.colors.onAccent} />
            </Pressable>
          )
        }}
      />
      <Tab.Screen name="Payments" component={PaymentsScreen} options={{ title: t('app.settlements') }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: t('app.more') }} />
    </Tab.Navigator>
  );
}
