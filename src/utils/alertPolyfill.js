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
    const actions = buttons.filter(b => b !== cancel);
    if (actions.length > 1) {
      const answer = window.prompt(`${text}\n\n${actions.map((b, i) => `${i + 1}. ${b.text}`).join('\n')}`, '1');
      const chosen = actions[Number(answer) - 1];
      if (chosen) chosen.onPress?.();
      else cancel?.onPress?.();
      return;
    }
    const action = actions[0];
    if (window.confirm(text)) action?.onPress?.();
    else cancel?.onPress?.();
  };
}
