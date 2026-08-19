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

const DebtItem = React.memo(({ item, activeTheme, accountList, styles, onEdit, onDelete }) => {
  const isOwe = item.type === 'owe';
  const dateStr = new Date(item.date).toLocaleDateString('pt-BR');
  const accountName = item.accountId ? accountList.find(a => a.id === item.accountId)?.name : 'Nenhuma Conta';
  
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
          <View style={[styles.iconBox, { backgroundColor: isOwe ? activeTheme.expense + '20' : activeTheme.income + '20' }]}>
            <Ionicons name={isOwe ? "arrow-up" : "arrow-down"} size={20} color={isOwe ? activeTheme.expense : activeTheme.income} />
          </View>
          <View>
            <Text style={styles.personName}>{item.personName}</Text>
            <Text style={styles.date}>{dateStr} • {accountName}</Text>
          </View>
        </View>
        <Text style={[styles.amount, { color: isOwe ? activeTheme.expense : activeTheme.income }]}>
          {isOwe ? '-' : '+'} R$ {item.amount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    </SwipeableCard>
  );
}, (prevProps, nextProps) => {
  return prevProps.item === nextProps.item &&
         prevProps.activeTheme === nextProps.activeTheme &&
         prevProps.accountList === nextProps.accountList;
});

export default function DebtsScreen({ navigation }) {
  const { activeTheme } = useContext(SettingsContext);
  const { debtsList, loadDebts, removeDebt } = useDebts();
  const { accountList, loadAccounts } = useAccounts();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);

  const styles = useMemo(() => ({ ...getSharedStyles(activeTheme), ...getLocalStyles(activeTheme) }), [activeTheme]);

  useFocusEffect(
    useCallback(() => {
      loadDebts();
      loadAccounts();
    }, [loadDebts, loadAccounts])
  );

  const totalOwe = debtsList.filter(d => d.type === 'owe').reduce((acc, d) => acc + d.amount, 0);
  const totalOwed = debtsList.filter(d => d.type === 'owed').reduce((acc, d) => acc + d.amount, 0);



  const handleEdit = useCallback((item) => {
    setEditingDebt(item);
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback((id) => {
    removeDebt(id);
  }, [removeDebt]);

  const renderItem = useCallback(({ item }) => {
    return (
      <DebtItem
        item={item}
        activeTheme={activeTheme}
        accountList={accountList}
        styles={styles}
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item.id)}
      />
    );
  }, [activeTheme, accountList, styles, handleEdit, handleDelete]);

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
        data={debtsList}
        keyExtractor={item => item.id.toString()}
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
        onClose={() => { setModalVisible(false); loadDebts(); }}
        onDelete={(id) => handleDelete(id)}
        initialData={editingDebt}
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
    fab: { position: 'absolute', right: 24 * z, bottom: 24 * z, width: 64 * z, height: 64 * z, borderRadius: 32 * z, backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65 }
  });
};
