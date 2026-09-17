import { AppRegistry } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { headlessNotificationListener } from './services/NotificationListener';
import { widgetTaskHandler } from './widget/WidgetTaskHandler';
import './services/BackgroundTasks';

// Registra o serviço em background o mais rápido possível
AppRegistry.registerHeadlessTask('RNAndroidNotificationListenerHeadlessJs', () => headlessNotificationListener);

// Registra o Widget Android
registerWidgetTaskHandler(widgetTaskHandler);
