const { withAndroidManifest } = require('@expo/config-plugins');

function withNotificationListener(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    // Garante que o array de services exista dentro da tag <application>
    if (!androidManifest.application[0].service) {
      androidManifest.application[0].service = [];
    }

    const hasService = androidManifest.application[0].service.some(
      (s) => s.$['android:name'] === 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListener'
    );

    if (!hasService) {
      androidManifest.application[0].service.push({
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

    return config;
  });
}

module.exports = withNotificationListener;
