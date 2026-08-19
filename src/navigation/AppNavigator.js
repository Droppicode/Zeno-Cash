import React, { useContext } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../context/SettingsContext';
import ExtractionBanner from '../components/ui/ExtractionBanner';
import { View, TouchableOpacity, Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import InvestmentsScreen from '../screens/InvestmentsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RecurrenceDetailsScreen from '../screens/RecurrenceDetailsScreen';
import DebtsScreen from '../screens/DebtsScreen';
import ExtractionReviewScreen from '../screens/ExtractionReviewScreen';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

function CustomTabBar({ state, descriptors, navigation, activeTheme }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: activeTheme.card, paddingBottom: 24, paddingTop: 8, height: 70 }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? activeTheme.accent : activeTheme.textSecondary;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName;
        if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
        else if (route.name === 'Transações') iconName = isFocused ? 'list' : 'list-outline';
        else if (route.name === 'Análise') iconName = isFocused ? 'pie-chart' : 'pie-chart-outline';
        else if (route.name === 'Investimentos') iconName = isFocused ? 'trending-up' : 'trending-up-outline';
        else if (route.name === 'Config') iconName = isFocused ? 'settings' : 'settings-outline';

        return (
          <TouchableOpacity
            key={index}
            onPress={onPress}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
          >
            <Ionicons name={iconName} size={24} color={color} />
            <Text style={{ fontSize: 10, color: color, marginTop: 4, fontFamily: activeTheme.fontFamily || 'monospace', fontWeight: isFocused ? 'bold' : 'normal' }}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  const { activeTheme, uiConfig } = useContext(SettingsContext);

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={props => <CustomTabBar {...props} activeTheme={activeTheme} />}
      screenOptions={{ swipeEnabled: true }}
      sceneContainerStyle={{ backgroundColor: activeTheme.background }}
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
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: activeTheme.background } }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="RecurrenceDetails" component={RecurrenceDetailsScreen} options={{ presentation: 'modal', animation: 'none' }} />
        <Stack.Screen name="Debts" component={DebtsScreen} options={{ animation: 'none' }} />
        <Stack.Screen name="ExtractionReview" component={ExtractionReviewScreen} options={{ presentation: 'fullScreenModal' }} />
      </Stack.Navigator>
      <ExtractionBanner />
    </View>
  );
}
