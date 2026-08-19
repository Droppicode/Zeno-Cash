import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';

import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import InvestmentsScreen from '../screens/InvestmentsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RecurrenceDetailsScreen from '../screens/RecurrenceDetailsScreen';
import DebtsScreen from '../screens/DebtsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { activeTheme, uiConfig } = useContext(SettingsContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Transações') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'Análise') iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          else if (route.name === 'Investimentos') iconName = focused ? 'trending-up' : 'trending-up-outline';
          else if (route.name === 'Config') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: activeTheme.accent,
        tabBarInactiveTintColor: activeTheme.textSecondary,
        headerShown: false,
        tabBarStyle: { backgroundColor: activeTheme.card, borderTopWidth: 0, paddingBottom: 24, paddingTop: 8, height: 70 },
        sceneStyle: { backgroundColor: activeTheme.background }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transações" component={TransactionsScreen} />
      <Tab.Screen name="Análise" component={AnalyticsScreen} />
      {uiConfig.showInvestmentsTab && (
        <Tab.Screen name="Investimentos" component={InvestmentsScreen} />
      )}
      <Tab.Screen name="Config" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoaded, activeTheme } = useContext(SettingsContext);

  if (!isLoaded) return null; // Aguarda carregar configurações

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: activeTheme.background } }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="RecurrenceDetails" component={RecurrenceDetailsScreen} options={{ presentation: 'modal', animation: 'none' }} />
      <Stack.Screen name="Debts" component={DebtsScreen} options={{ animation: 'none' }} />
    </Stack.Navigator>
  );
}
