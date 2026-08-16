import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import * as Notifications from 'expo-notifications';
import App from './App';
import { headlessNotificationListener } from './src/services/NotificationListener';

// Configuração Global de Notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Registra o serviço em background o mais rápido possível
AppRegistry.registerHeadlessTask('RNAndroidNotificationListenerHeadlessJs', () => headlessNotificationListener);

// Registra o componente raiz do aplicativo
registerRootComponent(App);
