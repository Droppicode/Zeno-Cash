import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { getZoomFactor } from '../../utils/scaler';

export default function CustomTextInput({
  theme,
  style,
  ...props
}) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  const styles = StyleSheet.create({
    input: {
      backgroundColor: theme.cardSecondary || theme.background,
      borderRadius: 6 * z,
      padding: 16 * z,
      fontSize: 16 * z,
      color: theme.text,
      fontFamily: f,
      marginBottom: 12 * z
    }
  });

  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={theme.textSecondary}
      {...props}
    />
  );
}
