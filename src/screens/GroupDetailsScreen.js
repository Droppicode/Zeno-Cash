import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { SettingsContext } from '../context/SettingsContext';
import { GroupsRepository } from '../services/GroupsRepository';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';
import { useAnalytics } from '../hooks/useAnalytics';
import TransactionItem from '../components/ui/TransactionItem';
import TransactionModal from '../components/TransactionModal';
import GroupModal from '../components/GroupModal';
import MonthlyEvolution from '../components/analytics/MonthlyEvolution';
import ExpenseComposition from '../components/analytics/ExpenseComposition';
import CategoryRanking from '../components/analytics/CategoryRanking';
import TopVillains from '../components/analytics/TopVillains';
import { calculateGroupStats } from '../utils/GroupStats';
import { CurrencyUtils } from '../utils/currencyUtils';
import { resolveCategory } from '../services/categorizer';
import { getZoomFactor } from '../utils/scaler';
import GroupTransactionPicker from '../components/GroupTransactionPicker';

export default function GroupDetailsScreen({ route, navigation }) {
  const { activeTheme, macroTargets, uiConfig } = useContext(SettingsContext);
  const { categoryList, loadCategories } = useCategories();
  const { accountList, loadAccounts } = useAccounts();
  const { updateTransaction, loadTransactions } = useTransactions();
  const [group, setGroup] = useState(null);
  const [groupTxs, setGroupTxs] = useState([]);
  const [editingTx, setEditingTx] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [transactionPickerVisible, setTransactionPickerVisible] = useState(false);
  const [isMacro, setIsMacro] = useState(false);
  const z = getZoomFactor(activeTheme);
  const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);

  const loadData = useCallback(async () => {
    const [loadedGroup, txs] = await Promise.all([
      GroupsRepository.getById(route.params.id),
      GroupsRepository.getTransactionsForGroup(route.params.id)
    ]);
    setGroup(loadedGroup);
    setGroupTxs(txs.filter(tx => tx.isIgnored !== 1));
    loadCategories();
    loadAccounts();
  }, [route.params.id, loadCategories, loadAccounts]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const settledTxs = useMemo(() => groupTxs.filter(tx => tx.isPending !== 1), [groupTxs]);
  const analyticsData = useAnalytics({
    txList: settledTxs,
    categoryList,
    accountList,
    recurrences: [],
    macroTargets,
    activeTheme,
    filters: { period: 'all', forecastPeriod: 'none', type: 'all', accountId: 'all', categoryId: 'all', isMacro }
  });
  if (!group) return <SafeAreaView style={styles.container} />;
  const stats = calculateGroupStats(groupTxs, group);
  const firstTxMonth = stats.firstDate
    ? `${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][new Date(stats.firstDate).getMonth()]}/${new Date(stats.firstDate).getFullYear()}`
    : '—';
  const budgetLabel = group.budget > 0
    ? `R$ ${CurrencyUtils.formatDisplay(Math.abs(stats.total))} / R$ ${CurrencyUtils.formatDisplay(group.budget)} (${Math.round(stats.budgetUsedPct || 0)}%)`
    : '—';
  const daysRemainingLabel = stats.daysRemaining != null
    ? `${stats.daysRemaining} dias`
    : (group.endDate && group.endDate <= Date.now() ? 'Encerrado' : '—');
  const ongoingTarget = group.kind === 'ongoing' && group.budget > 0 ? group.budget : null;
  const ongoingProgress = ongoingTarget ? (stats.currentMonthTotal / ongoingTarget) * 100 : 0;
  const ongoingProgressColor = ongoingProgress > 100 ? activeTheme.expense : (group.color || activeTheme.accent);

  const removeFromGroup = (tx) => {
    Alert.alert('Remover do grupo', 'A transação será mantida e apenas deixará este grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        const ids = await GroupsRepository.getGroupIdsForTransaction(tx.id);
        await GroupsRepository.setTransactionGroups(tx.id, ids.filter(id => id !== group.id));
        await loadData();
      }}
    ]);
  };

  const saveTransaction = async (data) => {
    await updateTransaction(data.id, data);
    await loadTransactions();
    setModalVisible(false);
    setEditingTx(null);
    await loadData();
  };

  const addTransactions = async ids => {
    const map = await GroupsRepository.getTransactionGroupMap();
    for (const id of ids) {
      const existing = map[id] || [];
      await GroupsRepository.setTransactionGroups(id, [...new Set([...existing, group.id])]);
    }
    setTransactionPickerVisible(false);
    await loadData();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={activeTheme.text} /></TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{group.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setTransactionPickerVisible(true)}><Ionicons name="add-circle-outline" size={22} color={activeTheme.text} /></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('GroupRules', { groupId: group.id })}><Ionicons name="funnel-outline" size={21} color={activeTheme.text} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setGroupModalVisible(true)}><Ionicons name="pencil" size={21} color={activeTheme.text} /></TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.kpiRow}>
          <View style={styles.kpi}><Text style={styles.kpiLabel}>Total</Text><Text style={styles.kpiValue}>R$ {CurrencyUtils.formatDisplay(Math.abs(stats.total))}</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiLabel}>Transações</Text><Text style={styles.kpiValue}>{stats.count}</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiLabel}>Média/mês</Text><Text style={styles.kpiValue}>R$ {CurrencyUtils.formatDisplay(Math.abs(stats.monthlyAverage))}</Text></View>
        </View>
        <View style={styles.kpiRow}>
          {group.kind === 'event' ? (
            <>
              <View style={styles.kpi}><Text style={styles.kpiLabel}>Orçamento</Text><Text style={styles.kpiValue}>{budgetLabel}</Text></View>
              <View style={styles.kpi}><Text style={styles.kpiLabel}>Média/dia</Text><Text style={styles.kpiValue}>R$ {CurrencyUtils.formatDisplay(Math.abs(stats.dailyAverage || 0))}</Text></View>
              <View style={styles.kpi}><Text style={styles.kpiLabel}>Dias restantes</Text><Text style={styles.kpiValue}>{daysRemainingLabel}</Text></View>
            </>
          ) : (
            <>
              <View style={styles.kpi}><Text style={styles.kpiLabel}>Média/ano</Text><Text style={styles.kpiValue}>R$ {CurrencyUtils.formatDisplay(Math.abs(stats.yearlyAverage))}</Text></View>
              <View style={styles.kpi}><Text style={styles.kpiLabel}>Desde</Text><Text style={styles.kpiValue}>{firstTxMonth}</Text></View>
              <View style={styles.kpi}><Text style={styles.kpiLabel}>Meses</Text><Text style={styles.kpiValue}>{stats.monthsSpan}</Text></View>
            </>
          )}
        </View>
        {group.kind === 'ongoing' && ongoingTarget && (
          <View style={styles.budgetProgress}>
            <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${Math.min(100, Math.max(0, ongoingProgress))}%`, backgroundColor: ongoingProgressColor }]} /></View>
            <Text style={styles.progressText}>Este mês: R$ {CurrencyUtils.formatDisplay(Math.abs(stats.currentMonthTotal))} / R$ {CurrencyUtils.formatDisplay(ongoingTarget)} ({Math.round(ongoingProgress)}%)</Text>
          </View>
        )}
        {group.kind === 'event' && group.budget > 0 && (
          <View style={styles.budgetProgress}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${Math.min(100, Math.max(0, stats.budgetUsedPct || 0))}%`, backgroundColor: (stats.budgetUsedPct || 0) > 100 ? activeTheme.expense : (group.color || activeTheme.accent) }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(stats.budgetUsedPct || 0)}% do orçamento</Text>
          </View>
        )}
        <View style={styles.chartList}>
          <MonthlyEvolution theme={activeTheme} bars={analyticsData.monthlyBars} line={analyticsData.monthlyLine} initiallyExpanded />
          <ExpenseComposition theme={activeTheme} data={analyticsData.compositionData} totalExpense={analyticsData.kpis.totalExpense} isMacro={isMacro} setIsMacro={setIsMacro} macroTargets={macroTargets} initiallyExpanded />
          <CategoryRanking theme={activeTheme} ranking={analyticsData.categoryRanking} initiallyExpanded={false} />
          <TopVillains theme={activeTheme} expenses={analyticsData.topExpenses} categoryList={categoryList} initiallyExpanded={false} />
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transações</Text>
          <TouchableOpacity style={styles.addTransactionsButton} onPress={() => setTransactionPickerVisible(true)}>
            <Ionicons name="add" size={17} color="#121212" />
            <Text style={styles.addTransactionsText}>Adicionar transações</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.transactionList}>
          {groupTxs.map((item, index) => {
            const catInfo = resolveCategory(item, categoryList);
            const accountName = accountList.find(account => String(account.id) === String(item.accountId))?.name || 'Sem Conta';
            return (
              <TransactionItem
                key={item.id}
                item={item}
                index={index}
                sectionLength={groupTxs.length}
                activeTheme={activeTheme}
                catInfo={catInfo}
                accountName={accountName}
                styles={styles}
                onEdit={() => { setEditingTx(item); setModalVisible(true); }}
                onDelete={() => removeFromGroup(item)}
                deleteText="Remover do grupo"
              />
            );
          })}
        </View>
      </ScrollView>
      <TransactionModal visible={modalVisible} initialData={editingTx} onClose={() => setModalVisible(false)} onSave={saveTransaction} />
      <GroupModal
        visible={groupModalVisible}
        theme={activeTheme}
        initialGroup={group}
        onClose={() => setGroupModalVisible(false)}
        onSave={async (id, data) => { await GroupsRepository.update(id, data); await loadData(); }}
        onDelete={async id => { await GroupsRepository.remove(id); navigation.goBack(); }}
        onRules={() => { setGroupModalVisible(false); navigation.navigate('GroupRules', { groupId: group.id }); }}
      />
      <GroupTransactionPicker
        visible={transactionPickerVisible}
        theme={activeTheme}
        groupId={group.id}
        hideSettlements={uiConfig.hideDebtSettlements !== false}
        onClose={() => setTransactionPickerVisible(false)}
        onConfirm={addTransactions}
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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 * z },
    title: { color: theme.text, fontSize: 19 * z, fontWeight: 'bold', fontFamily: f, maxWidth: '75%' },
    scroll: { padding: 16 * z, paddingBottom: 40 * z },
    kpiRow: { flexDirection: 'row', gap: 8 * z, marginBottom: 16 * z },
    kpi: { flex: 1, backgroundColor: theme.card, padding: 12 * z, borderRadius: 8 * z },
    kpiLabel: { color: theme.textSecondary, fontSize: 11 * z, fontFamily: f },
    kpiValue: { color: theme.text, fontSize: 15 * z, fontWeight: 'bold', marginTop: 5 * z, fontFamily: f },
    budgetProgress: { marginBottom: 16 * z },
    progressTrack: { height: 7 * z, borderRadius: 4 * z, backgroundColor: theme.cardSecondary, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 4 * z },
    progressText: { color: theme.textSecondary, fontSize: 11 * z, marginTop: 4 * z, fontFamily: f },
    chartList: { gap: 12 * z },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 16 * z },
    sectionTitle: { color: theme.text, fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
    addTransactionsButton: { flexDirection: 'row', alignItems: 'center', gap: 4 * z, backgroundColor: theme.accent, borderRadius: 6 * z, paddingHorizontal: 9 * z, paddingVertical: 8 * z },
    addTransactionsText: { color: '#121212', fontSize: 11 * z, fontWeight: 'bold', fontFamily: f },
    transactionList: { borderRadius: 8 * z, overflow: 'hidden' },
    card: { backgroundColor: theme.card, padding: 14 * z },
    iconBox: { width: 38 * z, height: 38 * z },
    desc: { color: theme.text, fontFamily: f },
    date: { color: theme.textSecondary, fontSize: 11 * z, fontFamily: f },
    amount: { fontWeight: 'bold', fontFamily: f }
  });
};
