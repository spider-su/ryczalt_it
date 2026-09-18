import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '../screens/HomeScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { PaymentsScreen } from '../screens/PaymentsScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { theme } from '../theme/theme';
import { t } from '../i18n';

const Tab = createBottomTabNavigator();

export type AppTabParamList = {
  Home: undefined;
  Documents: undefined;
  Payments: undefined;
  More: undefined;
};

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Documents: 'documents-outline',
  Payments: 'card-outline',
  More: 'ellipsis-horizontal'
};

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700'
        },
        tabBarStyle: {
          height: 78,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name] ?? 'ellipse-outline'} color={color} size={size} />
        )
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('app.home') }} />
      <Tab.Screen name="Documents" component={DocumentsScreen} options={{ title: t('app.invoices') }} />
      <Tab.Screen name="Payments" component={PaymentsScreen} options={{ title: t('app.settlements') }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: t('app.more') }} />
    </Tab.Navigator>
  );
}
