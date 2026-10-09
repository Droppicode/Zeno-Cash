const { withAndroidManifest } = require('@expo/config-plugins');

function withNotificationListener(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;
    const application = androidManifest.application[0];

    androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    // Garante que o array de services exista dentro da tag <application>
    if (!application.service) {
      application.service = [];
    }

    const hasService = application.service.some(
      (s) => s.$['android:name'] === 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener'
    );

    if (!hasService) {
      application.service.push({
        $: {
          'android:name': 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener',
          'android:label': 'RNAndroidNotificationListener',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true'
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.service.notification.NotificationListenerService'
                }
              }
            ]
          }
        ]
      });
    }

    if (!application.receiver) {
      application.receiver = [];
    }

    const bootReceiver = application.receiver.find(
      (receiver) => receiver.$['android:name'] === 'com.lesimoes.androidnotificationlistener.BootUpReceiver'
    );

    if (bootReceiver) {
      bootReceiver.$['tools:node'] = 'remove';
    } else {
      application.receiver.push({
        $: {
          'android:name': 'com.lesimoes.androidnotificationlistener.BootUpReceiver',
          'tools:node': 'remove'
        }
      });
    }

    return config;
  });
}

module.exports = withNotificationListener;
