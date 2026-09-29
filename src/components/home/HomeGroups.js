import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GroupsRepository } from '../../services/GroupsRepository';
import { useGroups } from '../../hooks/useGroups';
import { calculateGroupStats } from '../../utils/GroupStats';
import { CurrencyUtils } from '../../utils/currencyUtils';

export default function HomeGroups({ activeTheme, styles, navigation }) {
  const { groupList, loadGroups } = useGroups();
  const [groupsWithTransactions, setGroupsWithTransactions] = useState([]);

  const loadData = useCallback(async () => {
    const groups = await loadGroups();
    const rows = await Promise.all(groups.map(async group => {
      const transactions = await GroupsRepository.getTransactionsForGroup(group.id);
      return { group, transactions, latest: transactions[0]?.date || 0 };
    }));
    setGroupsWithTransactions(rows.sort((a, b) => b.latest - a.latest).slice(0, 3));
  }, [loadGroups]);

  useEffect(() => { loadData(); }, [loadData, groupList.length]);
  if (groupsWithTransactions.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={[styles.sectionTitle, { color: activeTheme.text, marginBottom: 0 }]}>Grupos</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Groups')}><Text style={{ color: activeTheme.accent, fontWeight: 'bold' }}>Ver Tudo</Text></TouchableOpacity>
      </View>
      <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
        {groupsWithTransactions.map(({ group, transactions }, index) => {
          const stats = calculateGroupStats(transactions, group);
          const color = group.color || activeTheme.accent;
          return (
            <TouchableOpacity key={group.id} style={[styles.groupedItem, index < groupsWithTransactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }]} onPress={() => navigation.navigate('GroupDetails', { id: group.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.groupedIcon, { backgroundColor: `${color}25` }]}><Ionicons name={group.icon || 'albums'} size={18} color={color} /></View>
                <Text style={[styles.groupedText, { color: activeTheme.text, flex: 1 }]} numberOfLines={1}>{group.name}</Text>
              </View>
              <Text style={[styles.groupedAmount, { color: activeTheme.text }]}>R$ {CurrencyUtils.formatDisplay(Math.abs(stats.total))}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
