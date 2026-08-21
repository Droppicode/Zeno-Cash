import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getZoomFactor } from '../../utils/scaler';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CollapsibleSection({ title, subtitle, children, theme, initiallyExpanded = true }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderRadius: 16 * z, padding: 20 * z, marginBottom: 20 * z }]}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18 * z, fontWeight: 'bold', fontFamily: f, color: theme.text }}>{title}</Text>
          {subtitle && expanded && (
            <Text style={{ fontSize: 12 * z, marginTop: 4 * z, fontFamily: f, color: theme.textSecondary }}>{subtitle}</Text>
          )}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={24 * z} color={theme.textSecondary} />
      </TouchableOpacity>
      
      {expanded && (
        <View style={{ marginTop: 16 * z }}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});
