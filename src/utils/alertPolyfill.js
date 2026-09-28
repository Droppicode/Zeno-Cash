import { Alert, Platform } from 'react-native';

if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length < 2) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    const cancel = buttons.find(b => b.style === 'cancel') || buttons[0];
    const action = [...buttons].reverse().find(b => b !== cancel);
    if (window.confirm(text)) action?.onPress?.();
    else cancel?.onPress?.();
  };
}
