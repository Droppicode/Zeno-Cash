import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';
import { headlessNotificationListener } from './src/services/NotificationListener';

// Registra o serviço em background o mais rápido possível
AppRegistry.registerHeadlessTask('RNAndroidNotificationListenerHeadlessJs', () => headlessNotificationListener);

// Registra o componente raiz do aplicativo
registerRootComponent(App);
