import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import InvestmentsScreen from '../screens/InvestmentsScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Transações') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'Análise') iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          else if (route.name === 'Investimentos') iconName = focused ? 'trending-up' : 'trending-up-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#BB86FC', // Cor primária dark mode
        tabBarInactiveTintColor: '#888',
        headerStyle: { backgroundColor: '#121212', shadowColor: 'transparent' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#1E1E1E', borderTopWidth: 0 },
        sceneStyle: { backgroundColor: '#121212' }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transações" component={TransactionsScreen} />
      <Tab.Screen name="Análise" component={AnalyticsScreen} />
      <Tab.Screen name="Investimentos" component={InvestmentsScreen} />
    </Tab.Navigator>
  );
}
