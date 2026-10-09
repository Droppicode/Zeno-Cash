import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { SettingsContext } from '../context/SettingsContext';
import { GroupsRepository } from '../services/GroupsRepository';
import { calculateGroupStats } from '../utils/GroupStats';
import { CurrencyUtils } from '../utils/currencyUtils';
import { getZoomFactor } from '../utils/scaler';
import { barMax, formatCompactYLabel, sanitizeSeries } from '../utils/chartSafety';

const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export default function GroupCompareScreen({ navigation }) {
  const { activeTheme } = useContext(SettingsContext);
  const [groups, setGroups] = useState([]);
  const [transactionsByGroup, setTransactionsByGroup] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const z = getZoomFactor(activeTheme);
  const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);

  const loadData = useCallback(async () => {
    const active = await GroupsRepository.getAll();
    const entries = await Promise.all(active.map(async group => [group.id, await GroupsRepository.getTransactionsForGroup(group.id)]));
    setGroups(active);
    setTransactionsByGroup(Object.fromEntries(entries));
    setSelectedIds(current => {
      const valid = current.filter(id => active.some(group => group.id === id));
      return valid.length >= 2 ? valid.slice(0, 4) : active.slice(0, 2).map(group => group.id);
    });
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  const selectedGroups = groups.filter(group => selectedIds.includes(group.id));
  const statsById = useMemo(() => Object.fromEntries(selectedGroups.map(group => [
    group.id,
    calculateGroupStats(transactionsByGroup[group.id] || [], group)
  ])), [selectedGroups, transactionsByGroup]);

  const toggleGroup = id => {
    setSelectedIds(current => {
      if (current.includes(id)) return current.length > 2 ? current.filter(value => value !== id) : current;
      return current.length < 4 ? [...current, id] : current;
    });
  };

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return { year: date.getFullYear(), month: date.getMonth(), label: monthNames[date.getMonth()] };
    });
  }, []);
  const chartData = useMemo(() => months.flatMap(month => selectedGroups.map((group, index) => {
    const total = (transactionsByGroup[group.id] || [])
      .filter(tx => tx.isIgnored !== 1 && tx.isPending !== 1)
      .filter(tx => {
        const date = new Date(tx.date);
        return date.getFullYear() === month.year && date.getMonth() === month.month;
      })
      .reduce((sum, tx) => sum + (tx.type === 'income' ? -Math.abs(tx.amount || 0) : Math.abs(tx.amount || 0)), 0);
    return { value: Number.isFinite(total) ? total : 0, label: index === 0 ? month.label : '', frontColor: group.color || activeTheme.accent, spacing: index === selectedGroups.length - 1 ? 14 * z : 2 * z };
  })), [months, selectedGroups, transactionsByGroup, activeTheme.accent, z]);
  const safeChartData = useMemo(() => sanitizeSeries(chartData), [chartData]);

  const format = value => `R$ ${CurrencyUtils.formatDisplay(Math.abs(value || 0))}`;
  const rows = [
    ['Total', group => statsById[group.id]?.total],
    ['Transações', group => statsById[group.id]?.count || 0],
    ['Média/mês', group => statsById[group.id]?.monthlyAverage],
    ['Média/ano', group => statsById[group.id]?.yearlyAverage],
    ['Orçamento/Meta', group => group.budget > 0 ? group.budget : null]
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={activeTheme.text} /></TouchableOpacity>
        <Text style={styles.title}>Comparar grupos</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Selecione de 2 a 4 grupos</Text>
        <View style={styles.chips}>
          {groups.map(group => {
            const selected = selectedIds.includes(group.id);
            const color = group.color || activeTheme.accent;
            return <TouchableOpacity key={group.id} style={[styles.groupChip, { borderColor: color, backgroundColor: selected ? `${color}35` : activeTheme.card }]} onPress={() => toggleGroup(group.id)}>
              <Ionicons name={group.icon || 'albums'} size={16} color={color} />
              <Text style={styles.groupChipText}>{group.name}</Text>
            </TouchableOpacity>;
          })}
        </View>
        {selectedGroups.length >= 2 && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
              <View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableLabel, styles.headerCell]}>Indicador</Text>
                  {selectedGroups.map(group => <Text key={group.id} style={[styles.valueCell, styles.headerCell, { color: group.color || activeTheme.accent }]}>{group.name}</Text>)}
                </View>
                {rows.map(([label, value]) => <View key={label} style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{label}</Text>
                  {selectedGroups.map(group => <Text key={group.id} style={styles.valueCell}>{value(group) == null ? '—' : label === 'Transações' ? value(group) : format(value(group))}</Text>)}
                </View>)}
              </View>
            </ScrollView>
            <Text style={styles.chartTitle}>Últimos seis meses</Text>
            {safeChartData.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false}><BarChart data={safeChartData} maxValue={barMax(safeChartData.map(item => item.value))} formatYLabel={formatCompactYLabel} barWidth={18 * z} height={190 * z} noOfSections={4} hideRules xAxisThickness={0} yAxisThickness={0} yAxisLabelTexts={[]} xAxisLabelTextStyle={{ color: activeTheme.textSecondary, fontSize: 10 * z }} /></ScrollView>}
          </>
        )}
        {selectedGroups.length < 2 && <Text style={styles.empty}>Selecione pelo menos dois grupos.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = theme => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, backgroundColor: theme.card },
    title: { color: theme.text, fontSize: 19 * z, fontWeight: 'bold', fontFamily: f },
    scroll: { padding: 16 * z, paddingBottom: 40 * z },
    sectionLabel: { color: theme.textSecondary, fontSize: 12 * z, fontFamily: f, marginBottom: 8 * z },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 * z, marginBottom: 18 * z },
    groupChip: { flexDirection: 'row', alignItems: 'center', gap: 5 * z, borderWidth: 1, borderRadius: 18 * z, paddingHorizontal: 10 * z, paddingVertical: 8 * z },
    groupChipText: { color: theme.text, fontSize: 12 * z, fontFamily: f },
    tableScroll: { backgroundColor: theme.card, borderRadius: 8 * z, padding: 8 * z },
    tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.background, minHeight: 46 * z },
    tableLabel: { width: 125 * z, color: theme.textSecondary, fontFamily: f, fontSize: 12 * z },
    valueCell: { width: 145 * z, color: theme.text, fontFamily: f, fontSize: 12 * z, textAlign: 'center' },
    headerCell: { fontWeight: 'bold' },
    chartTitle: { color: theme.text, fontSize: 16 * z, fontWeight: 'bold', fontFamily: f, marginTop: 22 * z, marginBottom: 10 * z },
    empty: { color: theme.textSecondary, textAlign: 'center', paddingVertical: 40 * z, fontFamily: f }
  });
};
