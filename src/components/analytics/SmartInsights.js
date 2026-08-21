import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from './CollapsibleSection';
import { getZoomFactor } from '../../utils/scaler';

export default function SmartInsights({ theme, insights }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  if (!insights || insights.length === 0) return null;

  const getColor = (type) => {
    switch (type) {
      case 'positive': return theme.income;
      case 'negative': return theme.expense;
      case 'warning': return '#FFC107'; // Amarelo fixo ou usar uma cor do tema
      default: return theme.accent;
    }
  };

  return (
    <CollapsibleSection title="Insights Inteligentes" subtitle="Alertas e dicas baseados nos seus dados" theme={theme} initiallyExpanded={true}>
      {insights.map((insight, index) => {
        const color = getColor(insight.type);
        return (
          <View key={index} style={[styles.card, { backgroundColor: color + '15', borderColor: color + '30', borderWidth: 1 }]}>
             <View style={[styles.iconBox, { backgroundColor: color + '30' }]}>
                <Ionicons name={insight.icon || 'bulb'} size={20 * z} color={color} />
             </View>
             <View style={{ flex: 1 }}>
                <Text style={[styles.text, { color: theme.text, fontFamily: f }]}>{insight.text}</Text>
             </View>
          </View>
        );
      })}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center'
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  text: {
    fontSize: 13,
    lineHeight: 18
  }
});
