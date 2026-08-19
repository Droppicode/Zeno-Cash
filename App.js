import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import AppNavigator from './src/navigation/AppNavigator';
import { seedDatabase } from './src/database/seed';
import { SettingsProvider } from './src/context/SettingsContext';
import { ExtractionProvider } from './src/context/ExtractionContext';
import * as Notifications from 'expo-notifications';
import ErrorBoundary from './src/components/ErrorBoundary';
import { registerBackgroundFetchAsync } from './src/services/BackgroundTasks';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

const prefix = Linking.createURL('/');

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Roda o seed se o banco estiver vazio e AGUARDA terminar
        await seedDatabase();

        // Solicita permissão de notificação local
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }

        // Registra a tarefa diária em background
        await registerBackgroundFetchAsync();

        if (Platform.OS === 'android') {
          try {
            await NavigationBar.setVisibilityAsync('hidden');
          } catch (e) {
            console.warn('Navigation bar hide failed (Activity not ready yet)');
          }
        }
      } catch (error) {
        console.error("Erro durante a inicialização do app:", error);
      } finally {
        setIsReady(true);
      }
    };

    initApp();
  }, []);

  const linking = {
    prefixes: [prefix, 'zenocash://'],
    config: {
      screens: {
        Home: 'add-transaction',
      },
    },
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BB86FC" />
        <StatusBar style="light" hidden={true} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SettingsProvider>
          <ExtractionProvider>
            <NavigationContainer linking={linking}>
              <AppNavigator />
              <StatusBar style="light" hidden={true} />
            </NavigationContainer>
          </ExtractionProvider>
        </SettingsProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
