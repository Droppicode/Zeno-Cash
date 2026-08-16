import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { seedDatabase } from './src/database/seed';
import { SettingsProvider } from './src/context/SettingsContext';

export default function App() {
  useEffect(() => {
    // Roda o seed se o banco estiver vazio
    seedDatabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
