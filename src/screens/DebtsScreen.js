import React, { useState, useContext, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import SwipeableCard from '../components/ui/SwipeableCard';
import { SettingsContext } from '../context/SettingsContext';
import { useDebts } from '../hooks/useDebts';
import DebtModal from '../components/DebtModal';
import { getZoomFactor } from '../utils/scaler';
import { useAccounts } from '../hooks/useAccounts';
import { getSharedStyles } from '../utils/StyleHub';
import TransactionModal from '../components/TransactionModal';
import { useTransactions } from '../hooks/useTransactions';
import { db } from '../database/db';
import { transactions } from '../database/schema';
import { eq } from 'drizzle-orm';

const DebtItem = React.memo(({ item, activeTheme, styles, onEdit, onDelete }) => {
  const isOwe = item.type === 'owe';
  const dateStr = new Date(item.date).toLocaleDateString('pt-BR');
  return (
    <SwipeableCard 
      onDelete={onDelete}
      containerStyle={{ marginBottom: styles.card.marginBottom, borderRadius: styles.card.borderRadius }}
    >
      <TouchableOpacity 
        style={[styles.card, { marginBottom: 0 }]} 
        onPress={onEdit}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconBox, { backgroundColor: item.isPaid === 1 ? activeTheme.income + '20' : (isOwe ? activeTheme.expense + '20' : activeTheme.income + '20') }]}>
            {item.isPaid === 1 ? (
               <Ionicons name="checkmark-done" size={20} color={activeTheme.income} />
            ) : (
               <Ionicons name={isOwe ? "arrow-up" : "arrow-down"} size={20} color={isOwe ? activeTheme.expense : activeTheme.income} />
            )}
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Text style={[styles.personName, item.isPaid === 1 && { textDecorationLine: 'line-through', opacity: 0.5 }]}>{item.personName}</Text>
               {item.transactionId && <Ionicons name="link" size={14} color={activeTheme.accent} style={{ marginLeft: 6 }} />}
            </View>
            <Text style={styles.date}>
              {item.description ? `${dateStr} • ${item.description}` : dateStr}
            </Text>
          </View>
        </View>
        <Text style={[styles.amount, { color: item.isPaid === 1 ? activeTheme.textSecondary : (isOwe ? activeTheme.expense : activeTheme.income) }]}>
          {isOwe ? '-' : '+'} R$ {item.amount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    </SwipeableCard>
  );
}, (prevProps, nextProps) => {
  return prevProps.item === nextProps.item &&
         prevProps.activeTheme === nextProps.activeTheme;
});

export default function DebtsScreen({ navigation }) {
  const { activeTheme } = useContext(SettingsContext);
  const { debtsList, loadDebts, removeDebt } = useDebts();
  const { accountList, loadAccounts } = useAccounts();
  const { txList, loadTransactions, updateTransaction, saveTransaction, removeTransaction } = useTransactions();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);

  const [expandedGroups, setExpandedGroups] = useState({});

  useFocusEffect(
    useCallback(() => {
      loadDebts();
      loadAccounts();
    }, [loadDebts, loadAccounts])
  );

  const realDebts = debtsList.filter(d => d.isPaid !== 1 && !(d.transactionId === null && d.recurrenceId !== null));

  const totalOwe = realDebts.filter(d => d.type === 'owe' && d.isPaid !== 1).reduce((acc, d) => acc + d.amount, 0);
  const totalOwed = realDebts.filter(d => d.type === 'owed' && d.isPaid !== 1).reduce((acc, d) => acc + d.amount, 0);

  const groupedDebts = useMemo(() => {
    const groups = {};
    realDebts.forEach(debt => {
      if (!groups[debt.personName]) {
        groups[debt.personName] = { personName: debt.personName, totalOwe: 0, totalOwed: 0, items: [] };
      }
      groups[debt.personName].items.push(debt);
      if (debt.isPaid !== 1) {
        if (debt.type === 'owe') groups[debt.personName].totalOwe += debt.amount;
        if (debt.type === 'owed') groups[debt.personName].totalOwed += debt.amount;
      }
    });
    return Object.values(groups).sort((a, b) => a.personName.localeCompare(b.personName));
  }, [debtsList]);

  const toggleGroup = (name) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };



  const handleEdit = useCallback((item) => {
    setEditingDebt(item);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback((id) => {
    removeDebt(id);
  }, [removeDebt]);

  const renderItem = useCallback(({ item: group }) => {
    const isExpanded = !!expandedGroups[group.personName];
    const netAmount = group.totalOwed - group.totalOwe;
    const netColor = netAmount > 0 ? activeTheme.income : (netAmount < 0 ? activeTheme.expense : activeTheme.textSecondary);

    return (
      <View style={{ marginBottom: 12 }}>
        <TouchableOpacity 
          style={[styles.groupCard, { backgroundColor: activeTheme.card, borderBottomLeftRadius: isExpanded ? 0 : 16, borderBottomRightRadius: isExpanded ? 0 : 16 }]} 
          onPress={() => toggleGroup(group.personName)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={20} color={activeTheme.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[styles.personName, { color: activeTheme.text, marginBottom: 0 }]}>{group.personName}</Text>
          </View>
          <Text style={[styles.amount, { color: netColor }]}>
            {netAmount > 0 ? '+' : (netAmount < 0 ? '-' : '')} R$ {Math.abs(netAmount).toFixed(2)}
          </Text>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={{ backgroundColor: activeTheme.cardSecondary, padding: 12, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
            {group.items.map(debt => (
              <DebtItem
                key={debt.id}
                item={debt}
                activeTheme={activeTheme}
                styles={styles}
                onEdit={() => handleEdit(debt)}
                onDelete={() => handleDelete(debt.id)}
              />
            ))}
          </View>
        )}
      </View>
    );
  }, [activeTheme, accountList, styles, handleEdit, handleDelete, expandedGroups]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: activeTheme.cardSecondary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeTheme.text }]}>Controle de Dívidas</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Eu Devo</Text>
          <Text style={[styles.summaryValue, { color: activeTheme.expense }]}>R$ {totalOwe.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Me Devem</Text>
          <Text style={[styles.summaryValue, { color: activeTheme.income }]}>R$ {totalOwed.toFixed(2)}</Text>
        </View>
      </View>

      <FlatList
        data={groupedDebts}
        keyExtractor={item => item.personName}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma dívida registrada.</Text>}
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => { setEditingDebt(null); setModalVisible(true); }}
      >
        <Ionicons name="add" size={32} color="#121212" />
      </TouchableOpacity>

      <DebtModal 
        visible={modalVisible}
        onClose={async (settlementData) => { 
          setModalVisible(false); 
          if (settlementData) {
            // Create settlement transaction
            await saveTransaction({
              amount: settlementData.amount,
              description: `Acerto: ${settlementData.personName} ${settlementData.description ? '- ' + settlementData.description : ''}`,
              type: settlementData.type === 'owe' ? 'expense' : 'income',
              accountId: settlementData.settlementAccountId,
              date: Date.now()
            });
            await loadTransactions();
          }
          loadDebts(); 
        }}
        onDelete={(id) => handleDelete(id)}
        initialData={editingDebt}
        onViewTransaction={async (debt) => {
          setModalVisible(false);
          if (debt.transactionId) {
            const res = await db.select().from(transactions).where(eq(transactions.id, debt.transactionId));
            if (res.length > 0) {
              setEditingTx(res[0]);
              setTxModalVisible(true);
            }
          } else if (debt.recurrenceId) {
            navigation.navigate('RecurrenceDetails', { id: debt.recurrenceId });
          }
        }}
      />
      
      <TransactionModal 
        visible={txModalVisible}
        initialData={editingTx}
        onClose={() => { setTxModalVisible(false); setEditingTx(null); }}
        onSave={async (data) => {
          if (editingTx && editingTx.id) {
            await updateTransaction(editingTx.id, data);
          } else {
            await saveTransaction(data);
          }
          setTxModalVisible(false);
          setEditingTx(null);
          await loadTransactions();
          await loadDebts();
        }}
        onDelete={async () => {
          if (editingTx && editingTx.id) {
            if (editingTx.recurrenceId) {
              await updateTransaction(editingTx.id, { isIgnored: 1, splitDebts: [] });
            } else {
              await removeTransaction(editingTx.id);
            }
            await loadTransactions();
            await loadDebts();
          }
          setTxModalVisible(false);
          setEditingTx(null);
        }}
      />
    </SafeAreaView>
  );
}

const getLocalStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';

  return StyleSheet.create({
    summaryContainer: { flexDirection: 'row', padding: 16 * z, gap: 16 * z, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.background },
    summaryCard: { flex: 1, backgroundColor: theme.background, padding: 16 * z, borderRadius: 16 * z, alignItems: 'center' },
    summaryLabel: { color: theme.textSecondary, fontSize: 14 * z, marginBottom: 8 * z, fontWeight: '600', fontFamily: f },
    summaryValue: { fontSize: 20 * z, fontWeight: 'bold', fontFamily: f },
    card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.card, padding: 16 * z, borderRadius: 16 * z, marginBottom: 12 * z },
    cardLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 44 * z, height: 44 * z, borderRadius: 22 * z, justifyContent: 'center', alignItems: 'center', marginRight: 14 * z },
    personName: { fontSize: 16 * z, fontWeight: '600', color: theme.text, marginBottom: 4 * z, fontFamily: f },
    date: { fontSize: 13 * z, color: theme.textSecondary, fontFamily: f },
    amount: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    groupCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 * z, borderTopLeftRadius: 16 * z, borderTopRightRadius: 16 * z, borderRadius: 16 * z },
    fab: { position: 'absolute', right: 24 * z, bottom: 24 * z, width: 64 * z, height: 64 * z, borderRadius: 32 * z, backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 }
  });
};
