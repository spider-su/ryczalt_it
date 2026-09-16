import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '../screens/HomeScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { PaymentsScreen } from '../screens/PaymentsScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { theme } from '../theme/theme';

const Tab = createBottomTabNavigator();

export type AppTabParamList = {
  Home: undefined;
  Documents: { kind?: 'INCOME' | 'COSTS'; review?: 'REVIEW' } | undefined;
  Tasks: { attentionOnly?: boolean } | undefined;
  Payments: undefined;
  More: undefined;
};

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Documents: 'documents-outline',
  Tasks: 'checkbox-outline',
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Documents" component={DocumentsScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
