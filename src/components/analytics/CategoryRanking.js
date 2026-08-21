import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from './CollapsibleSection';
import { getZoomFactor } from '../../utils/scaler';

export default function CategoryRanking({ theme, ranking }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  if (!ranking || ranking.length === 0) return null;

  const maxTotal = Math.max(...ranking.map(r => r.total));

  return (
    <CollapsibleSection title="Ranking de Categorias" subtitle="Onde seu dinheiro está indo" theme={theme} initiallyExpanded={false}>
      {ranking.map((item, index) => {
        const percent = (item.total / (maxTotal || 1)) * 100;
        return (
          <View key={index} style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
               <Ionicons name={item.icon} size={18 * z} color={item.color} />
            </View>
            
            <View style={{ flex: 1 }}>
              <View style={styles.header}>
                <Text style={[styles.name, { color: theme.text, fontFamily: f }]}>{item.name}</Text>
                <Text style={[styles.amount, { color: theme.text, fontFamily: f }]}>R$ {item.total.toFixed(2)}</Text>
              </View>
              
              <View style={styles.subHeader}>
                <Text style={[styles.txCount, { color: theme.textSecondary, fontFamily: f }]}>{item.txCount} transações</Text>
                <Text style={[styles.txCount, { color: theme.textSecondary, fontFamily: f }]}>Média: R$ {item.avg.toFixed(2)}</Text>
              </View>
              
              <View style={[styles.progressBarBg, { backgroundColor: theme.cardSecondary }]}>
                <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          </View>
        );
      })}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center'
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  amount: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  txCount: {
    fontSize: 11
  },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
});
