import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { SettingsContext } from '../context/SettingsContext';
import { GroupsRepository } from '../services/GroupsRepository';
import { useGroups } from '../hooks/useGroups';
import GroupModal from '../components/GroupModal';
import { calculateGroupStats } from '../utils/GroupStats';
import { CurrencyUtils } from '../utils/currencyUtils';
import { getZoomFactor } from '../utils/scaler';

export default function GroupsScreen({ navigation }) {
  const { activeTheme } = useContext(SettingsContext);
  const { groupList, loadGroups, saveGroup, deleteGroup } = useGroups();
  const [transactionsByGroup, setTransactionsByGroup] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const z = getZoomFactor(activeTheme);
  const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);

  const loadData = useCallback(async () => {
    const groups = await loadGroups({ includeArchived: true });
    const entries = await Promise.all(groups.map(async group => [group.id, await GroupsRepository.getTransactionsForGroup(group.id)]));
    setTransactionsByGroup(Object.fromEntries(entries));
  }, [loadGroups]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  const activeGroups = groupList.filter(group => group.isArchived !== 1);
  const archivedGroups = groupList.filter(group => group.isArchived === 1);

  const renderGroup = (group) => {
    const stats = calculateGroupStats(transactionsByGroup[group.id] || [], group);
    const color = group.color || activeTheme.accent;
    return (
      <TouchableOpacity key={group.id} style={styles.card} onPress={() => navigation.navigate('GroupDetails', { id: group.id })}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: `${color}25` }]}><Ionicons name={group.icon || 'albums'} size={22} color={color} /></View>
          <View style={{ flex: 1, marginLeft: 10 * z }}>
            <Text style={styles.name}>{group.name}</Text>
            <Text style={styles.kind}>{group.kind === 'event' ? 'Evento' : 'Contínuo'}</Text>
          </View>
          <Text style={[styles.total, { color: stats.total >= 0 ? activeTheme.expense : activeTheme.income }]}>R$ {CurrencyUtils.formatDisplay(Math.abs(stats.total))}</Text>
        </View>
        <Text style={styles.count}>{stats.count} transação{stats.count === 1 ? '' : 'ções'}</Text>
        {group.kind === 'event' && group.budget > 0 && (
          <View style={{ marginTop: 10 * z }}>
            <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${Math.min(100, Math.max(0, stats.budgetUsedPct || 0))}%`, backgroundColor: color }]} /></View>
            <Text style={styles.progressText}>{Math.round(stats.budgetUsedPct || 0)}% do orçamento</Text>
          </View>
        )}
        {group.kind === 'ongoing' && <Text style={styles.average}>Média mensal: R$ {CurrencyUtils.formatDisplay(Math.abs(stats.monthlyAverage))}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={activeTheme.text} /></TouchableOpacity>
        <Text style={styles.title}>Grupos</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {activeGroups.map(renderGroup)}
        {archivedGroups.length > 0 && (
          <>
            <TouchableOpacity style={styles.archivedHeader} onPress={() => setShowArchived(value => !value)}>
              <Text style={styles.archivedTitle}>Arquivados ({archivedGroups.length})</Text>
              <Ionicons name={showArchived ? 'chevron-up' : 'chevron-down'} size={20} color={activeTheme.textSecondary} />
            </TouchableOpacity>
            {showArchived && archivedGroups.map(renderGroup)}
          </>
        )}
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={() => { setEditingGroup(null); setShowEditor(true); }}><Ionicons name="add" size={30} color="#121212" /></TouchableOpacity>
      <GroupModal
        visible={showEditor}
        theme={activeTheme}
        initialGroup={editingGroup}
        onClose={() => setShowEditor(false)}
        onSave={async (id, data) => { await saveGroup(id, data); await loadData(); }}
        onDelete={async id => { await deleteGroup(id); await loadData(); }}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, backgroundColor: theme.card },
    title: { color: theme.text, fontSize: 20 * z, fontWeight: 'bold', fontFamily: f },
    scroll: { padding: 16 * z, paddingBottom: 100 * z },
    card: { backgroundColor: theme.card, borderRadius: 8 * z, padding: 16 * z, marginBottom: 12 * z },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 42 * z, height: 42 * z, borderRadius: 8 * z, alignItems: 'center', justifyContent: 'center' },
    name: { color: theme.text, fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    kind: { color: theme.textSecondary, fontSize: 12 * z, marginTop: 2 * z, fontFamily: f },
    total: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    count: { color: theme.textSecondary, marginTop: 12 * z, fontFamily: f },
    average: { color: theme.textSecondary, fontSize: 12 * z, marginTop: 8 * z, fontFamily: f },
    progressTrack: { height: 7 * z, borderRadius: 4 * z, backgroundColor: theme.cardSecondary, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 4 * z },
    progressText: { color: theme.textSecondary, fontSize: 11 * z, marginTop: 4 * z, fontFamily: f },
    archivedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 * z },
    archivedTitle: { color: theme.textSecondary, fontWeight: 'bold', fontFamily: f },
    fab: { position: 'absolute', right: 20 * z, bottom: 20 * z, width: 58 * z, height: 58 * z, borderRadius: 29 * z, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }
  });
};
