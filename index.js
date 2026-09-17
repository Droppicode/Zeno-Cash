import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import * as Notifications from 'expo-notifications';
import './src/setup';

// Configuração Global de Notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Inicializações Nativas movidas para src/setup.js

// Registra o componente raiz do aplicativo
registerRootComponent(function AppRoot() {
  const App = require('./App').default;
  return <App />;
});
