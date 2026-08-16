import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';

import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import InvestmentsScreen from '../screens/InvestmentsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const { accentColor, isLoaded } = useContext(SettingsContext);

  if (!isLoaded) return null; // Aguarda carregar configurações

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
        tabBarActiveTintColor: accentColor,
        tabBarInactiveTintColor: '#888',
        headerShown: false, // Esconde a barra de título superior
        tabBarStyle: { backgroundColor: '#1E1E1E', borderTopWidth: 0 },
        sceneStyle: { backgroundColor: '#121212' }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transações" component={TransactionsScreen} />
      <Tab.Screen name="Análise" component={AnalyticsScreen} />
      <Tab.Screen name="Investimentos" component={InvestmentsScreen} />
      <Tab.Screen name="Config" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
