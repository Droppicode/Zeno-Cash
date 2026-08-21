import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from './CollapsibleSection';
import { getZoomFactor } from '../../utils/scaler';

export default function RecurrenceAnalysis({ theme, stats }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  if (!stats || stats.list.length === 0) return null;

  return (
    <CollapsibleSection title="Recorrências" subtitle="Custos fixos e assinaturas mensais" theme={theme} initiallyExpanded={false}>
      <View style={{ alignItems: 'center', marginBottom: 20 * z }}>
         <Text style={[styles.totalLabel, { color: theme.textSecondary, fontFamily: f }]}>Total Comprometido / Mês</Text>
         <Text style={[styles.totalValue, { color: theme.expense, fontFamily: f }]}>R$ {stats.totalMonthly.toFixed(2)}</Text>
         <Text style={[styles.proj, { color: theme.textSecondary, fontFamily: f }]}>Projeção anual: R$ {(stats.totalMonthly * 12).toFixed(2)}</Text>
      </View>
      
      {stats.list.filter(r => r.type === 'expense').sort((a,b) => b.amount - a.amount).slice(0, 5).map((rec, idx) => (
        <View key={rec.id} style={[styles.row, { borderBottomColor: theme.background, borderBottomWidth: idx === 4 ? 0 : 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="repeat" size={16 * z} color={theme.textSecondary} style={{ marginRight: 8 * z }} />
            <View>
              <Text style={[styles.name, { color: theme.text, fontFamily: f }]}>{rec.description}</Text>
              <Text style={[styles.freq, { color: theme.textSecondary, fontFamily: f }]}>
                 {rec.frequencyType === 'monthly' ? `A cada ${rec.frequencyInterval} mês(es)` : 'Customizado'}
                 {rec.installments ? ` • ${rec.installments}x` : ''}
              </Text>
            </View>
          </View>
          <Text style={[styles.amount, { color: theme.expense, fontFamily: f }]}>- R$ {rec.amount.toFixed(2)}</Text>
        </View>
      ))}
      
      {stats.list.filter(r => r.type === 'expense').length > 5 && (
         <Text style={{ textAlign: 'center', color: theme.accent, fontSize: 12 * z, marginTop: 12 * z, fontFamily: f }}>
            + {stats.list.filter(r => r.type === 'expense').length - 5} outras recorrências
         </Text>
      )}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  totalLabel: {
    fontSize: 14
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 4
  },
  proj: {
    fontSize: 12
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  freq: {
    fontSize: 11,
    marginTop: 2
  },
  amount: {
    fontSize: 14,
    fontWeight: 'bold'
  }
});
