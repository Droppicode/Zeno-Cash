import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PIN_MAX } from '../../utils/pinLock';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];

export default function PinPad({ value, onChange, onSubmit, theme, onBiometric, disabled }) {
  const press = (key) => {
    if (disabled) return;
    if (key === 'del') onChange(value.slice(0, -1));
    else if (key === 'bio') onBiometric?.();
    else if (value.length < PIN_MAX) onChange(value + key);
  };
  const f = theme.fontFamily || 'monospace';

  return (
    <View style={styles.wrap}>
      <View style={styles.dots} testID="pin-dots">
        {Array.from({ length: Math.max(4, value.length) }).map((_, i) => (
          <View key={i} style={[styles.dot, { borderColor: theme.accent, backgroundColor: i < value.length ? theme.accent : 'transparent' }]} />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map(key => {
          if (key === 'bio' && !onBiometric) return <View key={key} style={styles.key} />;
          return (
            <TouchableOpacity
              key={key}
              accessibilityLabel={key === 'del' ? 'Apagar' : key === 'bio' ? 'Usar biometria' : key}
              style={[styles.key, { backgroundColor: theme.card, opacity: disabled ? 0.4 : 1 }]}
              onPress={() => press(key)}
            >
              {key === 'del' && <Ionicons name="backspace-outline" size={24} color={theme.text} />}
              {key === 'bio' && <Ionicons name="finger-print" size={26} color={theme.accent} />}
              {key !== 'del' && key !== 'bio' && <Text style={[styles.keyText, { color: theme.text, fontFamily: f }]}>{key}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        accessibilityLabel="Confirmar PIN"
        style={[styles.submit, { backgroundColor: theme.accent, opacity: disabled || value.length < 4 ? 0.4 : 1 }]}
        disabled={disabled || value.length < 4}
        onPress={onSubmit}
      >
        <Text style={[styles.submitText, { fontFamily: f }]}>OK</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 14, marginBottom: 32, minHeight: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  grid: { width: 264, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  key: { width: 76, height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 26, fontWeight: 'bold' },
  submit: { marginTop: 20, width: 252, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#121212', fontWeight: 'bold', fontSize: 16 }
});
