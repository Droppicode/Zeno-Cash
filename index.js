import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { headlessNotificationListener } from './src/services/NotificationListener';
import { widgetTaskHandler } from './src/widget/WidgetTaskHandler';

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

// Registra o Widget Android
registerWidgetTaskHandler(widgetTaskHandler);

// Registra o componente raiz do aplicativo
registerRootComponent(App);
