import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getZoomFactor } from '../../utils/scaler';

export default function AnalyticsFilters({ theme, filters, setFilters, accounts, categories }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.background }]}>
      
      {/* Linha 1: Período e Previsão (Toggles) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
        <View style={styles.group}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Período:</Text>
          {['7d', '30d', '90d', 'all'].map(p => (
            <TouchableOpacity 
              key={p}
              style={[styles.pill, { backgroundColor: filters.period === p ? theme.accent : theme.cardSecondary }]}
              onPress={() => updateFilter('period', p)}
            >
              <Text style={[styles.pillText, { color: filters.period === p ? '#121212' : theme.textSecondary }]}>
                {p === '7d' ? '7 Dias' : p === '30d' ? '30 Dias' : p === '90d' ? '90 Dias' : 'Sempre'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.group}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Previsão:</Text>
          {['none', '30d', '60d'].map(p => (
            <TouchableOpacity 
              key={p}
              style={[styles.pill, { backgroundColor: filters.forecastPeriod === p ? theme.accent : theme.cardSecondary }]}
              onPress={() => updateFilter('forecastPeriod', p)}
            >
              <Text style={[styles.pillText, { color: filters.forecastPeriod === p ? '#121212' : theme.textSecondary }]}>
                {p === 'none' ? 'Sem' : p === '30d' ? '+30d' : '+60d'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Linha 2: Conta e Tipo (Toggles Simples por enquanto) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.scrollRow, { marginTop: 12 * z }]}>
        <View style={styles.group}>
           <Text style={[styles.label, { color: theme.textSecondary }]}>Tipo:</Text>
           {['all', 'expense'].map(t => (
            <TouchableOpacity 
              key={t}
              style={[styles.pill, { backgroundColor: filters.type === t ? theme.accent : theme.cardSecondary }]}
              onPress={() => updateFilter('type', t)}
            >
              <Text style={[styles.pillText, { color: filters.type === t ? '#121212' : theme.textSecondary }]}>
                {t === 'all' ? 'Tudo' : 'Só Despesas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.group}>
           <Text style={[styles.label, { color: theme.textSecondary }]}>Conta:</Text>
           <TouchableOpacity 
              style={[styles.pill, { backgroundColor: filters.accountId === 'all' ? theme.accent : theme.cardSecondary }]}
              onPress={() => updateFilter('accountId', 'all')}
            >
              <Text style={[styles.pillText, { color: filters.accountId === 'all' ? '#121212' : theme.textSecondary }]}>
                Todas
              </Text>
            </TouchableOpacity>
            {accounts.map(acc => (
              <TouchableOpacity 
                key={acc.id}
                style={[styles.pill, { backgroundColor: filters.accountId === acc.id ? theme.accent : theme.cardSecondary }]}
                onPress={() => updateFilter('accountId', acc.id)}
              >
                <Text style={[styles.pillText, { color: filters.accountId === acc.id ? '#121212' : theme.textSecondary }]}>
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    zIndex: 10
  },
  scrollRow: {
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row'
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#888',
    opacity: 0.3,
    marginHorizontal: 12
  }
});
