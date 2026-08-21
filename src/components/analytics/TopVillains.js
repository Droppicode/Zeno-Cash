import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from './CollapsibleSection';
import { resolveCategory } from '../../services/categorizer';
import { getZoomFactor } from '../../utils/scaler';

export default function TopVillains({ theme, expenses, categoryList }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  
  const [limit, setLimit] = useState(3);

  if (!expenses || expenses.length === 0) return null;

  return (
    <CollapsibleSection title={`Top ${limit} Vilões`} subtitle="As maiores despesas isoladas do período" theme={theme} initiallyExpanded={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 * z }}>
         <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: theme.cardSecondary }]} onPress={() => setLimit(limit === 3 ? 5 : (limit === 5 ? 10 : 3))}>
            <Text style={{ fontSize: 12 * z, color: theme.accent, fontWeight: 'bold', fontFamily: f }}>Ver Top {limit === 3 ? 5 : (limit === 5 ? 10 : 3)}</Text>
         </TouchableOpacity>
      </View>
      
      {expenses.slice(0, limit).map((item, idx) => {
        const catInfo = resolveCategory(item, categoryList);
        return (
          <View key={item.id} style={[styles.vilaoCard, { backgroundColor: theme.cardSecondary }]}>
            <Text style={[styles.vilaoRank, { color: theme.accent, fontFamily: f }]}>#{idx + 1}</Text>
            <View style={{ flex: 1, marginLeft: 12 * z }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Ionicons name={catInfo.icon} size={14 * z} color={catInfo.color} style={{ marginRight: 4 * z }} />
                 <Text style={[styles.vilaoDesc, { color: theme.text, fontFamily: f }]} numberOfLines={1}>{item.description}</Text>
              </View>
              <Text style={[styles.vilaoCat, { color: theme.textSecondary, fontFamily: f }]}>
                 {catInfo.categoryName} • {new Date(item.date).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            <Text style={[styles.vilaoAmount, { color: theme.expense, fontFamily: f }]}>- R$ {item.amount.toFixed(2)}</Text>
          </View>
        );
      })}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  vilaoCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },
  vilaoRank: { fontSize: 20, fontWeight: 'bold' },
  vilaoDesc: { fontSize: 14, fontWeight: 'bold', flexShrink: 1 },
  vilaoCat: { fontSize: 11, marginTop: 2 },
  vilaoAmount: { fontSize: 14, fontWeight: 'bold' },
});
