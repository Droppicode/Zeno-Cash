import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from './CollapsibleSection';
import { getZoomFactor } from '../../utils/scaler';

export default function AccountAnalysis({ theme, breakdown }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  if (!breakdown || breakdown.length === 0) return null;

  return (
    <CollapsibleSection title="Análise por Conta" subtitle="Entradas e saídas de cada conta" theme={theme} initiallyExpanded={false}>
      {breakdown.map((acc, index) => (
        <View key={acc.id} style={[styles.card, { backgroundColor: theme.cardSecondary, marginBottom: 12 * z }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <View style={[styles.iconContainer, { backgroundColor: (acc.color || theme.text) + '20' }]}>
                  <Ionicons name={acc.icon || 'wallet'} size={16 * z} color={acc.color || theme.text} />
               </View>
               <Text style={[styles.name, { color: theme.text, fontFamily: f }]}>{acc.name}</Text>
            </View>
            <Text style={[styles.balance, { color: theme.text, fontFamily: f }]}>Atual: R$ {(acc.currentBalance || acc.balance || 0).toFixed(2)}</Text>
          </View>
          
          <View style={styles.statsRow}>
             <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: f }]}>Entradas no período</Text>
                <Text style={[styles.statValue, { color: theme.income, fontFamily: f }]}>+ R$ {acc.periodIncome.toFixed(2)}</Text>
             </View>
             <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: f }]}>Saídas no período</Text>
                <Text style={[styles.statValue, { color: theme.expense, fontFamily: f }]}>- R$ {acc.periodExpense.toFixed(2)}</Text>
             </View>
          </View>
          
          <View style={[styles.netBox, { backgroundColor: theme.card }]}>
             <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: f }]}>Variação no Período</Text>
             <Text style={[styles.netValue, { color: acc.periodBalance >= 0 ? theme.income : theme.expense, fontFamily: f }]}>
               {acc.periodBalance >= 0 ? '+' : '-'} R$ {Math.abs(acc.periodBalance).toFixed(2)}
             </Text>
          </View>
        </View>
      ))}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  balance: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statBox: {
    flex: 1
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  netBox: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  netValue: {
    fontSize: 14,
    fontWeight: 'bold'
  }
});
