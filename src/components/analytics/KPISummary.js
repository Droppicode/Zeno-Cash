import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getZoomFactor } from '../../utils/scaler';

export default function KPISummary({ theme, data }) {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  const formatCurrency = (val) => `R$ ${Math.abs(val).toFixed(2)}`;

  const cards = [
    { title: 'Saldo Líquido', value: formatCurrency(data.netBalance), color: data.netBalance >= 0 ? theme.income : theme.expense, icon: 'wallet-outline' },
    { title: 'Despesa Total', value: formatCurrency(data.totalExpense), color: theme.expense, icon: 'arrow-down-circle-outline' },
    { title: 'Receita Total', value: formatCurrency(data.totalIncome), color: theme.income, icon: 'arrow-up-circle-outline' },
    { title: 'Média Diária', value: formatCurrency(data.dailyAverage), color: theme.text, icon: 'calendar-outline' },
    { title: 'Taxa Poupança', value: `${data.savingsRate.toFixed(1)}%`, color: data.savingsRate >= 0 ? theme.income : theme.expense, icon: 'trending-up-outline' },
    { title: 'Transações', value: `${data.txCount}`, color: theme.accent, icon: 'list-outline' }
  ];

  if (data.biggestExpense) {
     cards.push({ title: 'Maior Gasto', value: formatCurrency(data.biggestExpense.amount), color: theme.expense, icon: 'alert-circle-outline' });
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 * z, paddingBottom: 16 * z }}>
      {cards.map((c, i) => (
        <View key={i} style={[styles.card, { backgroundColor: theme.card, marginRight: 12 * z }]}>
          <View style={styles.header}>
            <Ionicons name={c.icon} size={20 * z} color={theme.textSecondary} />
            <Text style={[styles.title, { color: theme.textSecondary, fontFamily: f }]}>{c.title}</Text>
          </View>
          <Text style={[styles.value, { color: c.color, fontFamily: f }]}>{c.value}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    minWidth: 140,
    elevation: 2
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold'
  }
});
