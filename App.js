import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import AppNavigator from './src/navigation/AppNavigator';
import { seedDatabase } from './src/database/seed';
import { Platform } from 'react-native';
import { initWebDb } from './src/database/db';

import { SettingsProvider } from './src/context/SettingsContext';
import { ExtractionProvider } from './src/context/ExtractionContext';
import * as Notifications from 'expo-notifications';
import ErrorBoundary from './src/components/ErrorBoundary';
import { registerBackgroundFetchAsync } from './src/services/BackgroundTasks';
import * as NavigationBar from 'expo-navigation-bar';
import { performSilentDailyBackup } from './src/services/GoogleDriveBackup';
import WebMockPanel from './src/components/WebMockPanel';

const prefix = Linking.createURL('/');

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Inicializa o banco web e popula mock data se for web
        if (Platform.OS === 'web' && initWebDb) {
          await initWebDb();
        }

        // Roda o seed nativo se o banco estiver vazio e AGUARDA terminar
        await seedDatabase();

        if (Platform.OS !== 'web') {
          // Solicita permissão de notificação local
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }

          // Registra a tarefa diária em background
          await registerBackgroundFetchAsync();
        }

        // Tenta executar o backup diário silencioso do Google Drive
        await performSilentDailyBackup();

        if (Platform.OS === 'android') {
          try {
            await NavigationBar.setVisibilityAsync('hidden');
          } catch (e) {
            console.warn('Navigation bar hide failed (Activity not ready yet)');
          }
        } else if (Platform.OS === 'web') {
          console.log('App running on Web for Mocking');
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
      <View style={Platform.OS === 'web' ? styles.webFrameContainer : styles.flex1}>
        <View style={Platform.OS === 'web' ? styles.webMobileFrame : styles.flex1}>
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
        </View>
        <WebMockPanel />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  webFrameContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMobileFrame: {
    width: 390,
    height: 844, // Proporção parecida com iPhone 13/14
    backgroundColor: '#121212',
    paddingTop: 8,
    overflow: 'hidden',
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  }
});
