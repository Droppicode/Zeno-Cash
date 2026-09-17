import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CurrencyUtils } from '../utils/currencyUtils';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Image, DeviceEventEmitter, Platform } from 'react-native';
import SwipeableCard from '../components/ui/SwipeableCard';
import MonthSelector from '../components/ui/MonthSelector';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resolveCategory } from '../services/categorizer';
import { SettingsContext } from '../context/SettingsContext';
import { useFocusEffect } from '@react-navigation/native';
import { useTransactions } from '../hooks/useTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useDebts } from '../hooks/useDebts';
import TransactionModal from '../components/TransactionModal';
import { getZoomFactor } from '../utils/scaler';

import HomeAccountsList from '../components/home/HomeAccountsList';
import HomeCreditCardsList from '../components/home/HomeCreditCardsList';
import HomePendingTx from '../components/home/HomePendingTx';
import HomeRecentTx from '../components/home/HomeRecentTx';
import HomeDebts from '../components/home/HomeDebts';

export default function HomeScreen({ route, navigation }) {
  const { activeTheme, uiConfig, defaultPeriod } = React.useContext(SettingsContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  
  const [centerMonthDate, setCenterMonthDate] = useState(new Date());
  const [selectedMonths, setSelectedMonths] = useState([`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`]);
  
  useEffect(() => {
    if (route?.params?.type) {
      const type = route.params.type;
      if (type === 'expense' || type === 'income') {
        setEditingTx({ type, amount: '', description: '', note: '' });
        setModalVisible(true);
        navigation.setParams({ type: undefined });
      }
    }
  }, [route?.params?.type]);
  
  const { 
    txList, 
    loadTransactions, 
    saveTransaction: saveTx, 
    updateTransaction, 
    removeTransaction, 
    filterByPeriod,
    cachedBalances,
    loadMonthlyBalances 
  } = useTransactions();
  const { accountList, loadAccounts } = useAccounts();
  const { categoryList, loadCategories } = useCategories();
  const { debtsList, loadDebts } = useDebts();

  const styles = React.useMemo(() => getStyles(activeTheme), [activeTheme]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      loadAccounts();
      loadCategories();
      loadDebts();
    }, [])
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      const subscription = DeviceEventEmitter.addListener('refreshTransactions', () => {
        loadTransactions();
        loadAccounts();
        loadCategories();
        loadDebts();
      });
      return () => subscription.remove();
    }
  }, [loadTransactions, loadAccounts, loadCategories, loadDebts]);

  const accountBalances = useMemo(() => {
    return accountList.map(acc => {
      const current = acc.currentBalance !== undefined ? acc.currentBalance : (acc.balance || 0);
      return { ...acc, currentBalance: current };
    });
  }, [accountList]);

  const filteredTxList = useMemo(() => filterByPeriod(txList, selectedMonths), [txList, selectedMonths, filterByPeriod]);
  
  useEffect(() => {
    loadMonthlyBalances(selectedMonths);
  }, [selectedMonths, txList, loadMonthlyBalances]);

  const balance = cachedBalances;

  const { pendingTxList, displayPendingList, recentTxList } = useMemo(() => {
    const pending = txList.filter(t => t.isPending === 1 && t.isIgnored !== 1).sort((a, b) => a.date - b.date);
    return {
      pendingTxList: pending,
      displayPendingList: pending.slice(0, 10),
      recentTxList: txList.filter(t => t.isPending !== 1 && t.isIgnored !== 1 && t.date <= Date.now())
    };
  }, [txList]);
  const homeOrderRaw = uiConfig.homeModulesOrder || ['accounts', 'creditCards', 'pending', 'recent'];
  let homeOrder = homeOrderRaw.includes('debts') ? homeOrderRaw : [...homeOrderRaw, 'debts'];
  if (!homeOrder.includes('creditCards')) {
    const idx = homeOrder.indexOf('accounts');
    if (idx !== -1) homeOrder.splice(idx + 1, 0, 'creditCards');
    else homeOrder.push('creditCards');
  }

  const saveTransaction = async (data) => {
    data.isPending = 0; // Ao salvar/aprovar, tira a flag de pendente
    await saveTx(data.id, data);
    await loadAccounts(); // Recarrega os saldos do DB
    await loadDebts(); // Recarrega dívidas caso a transação envolva divisão
    setModalVisible(false);
    setEditingTx(null);
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          paddingHorizontal: 16 * getZoomFactor(activeTheme), 
          paddingTop: 4 * getZoomFactor(activeTheme), 
          paddingBottom: 32 * getZoomFactor(activeTheme) 
        }}
      >
        {/* Resumo Dinâmico (Total do Período) */}
        <View style={[styles.summaryCard, { backgroundColor: activeTheme.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.summaryTitle, { color: activeTheme.textSecondary }]}>Balanço do Período</Text>
            <MonthSelector 
              theme={activeTheme}
              centerDate={centerMonthDate}
              selectedMonths={selectedMonths}
              onCenterChange={setCenterMonthDate}
              onSelectionChange={setSelectedMonths}
            />
          </View>
          <Text style={[styles.summaryAmount, { color: activeTheme.text }]}>R$ {CurrencyUtils.formatDisplay(balance.total)}</Text>
          
          <View style={styles.row}>
            <View style={styles.incomeBox}>
              <Text style={[styles.incomeText, { color: activeTheme.textSecondary }]}>Receitas</Text>
              <Text style={[styles.incomeValue, { color: activeTheme.income }]}>+ R$ {CurrencyUtils.formatDisplay(balance.income)}</Text>
            </View>
            <View style={styles.expenseBox}>
              <Text style={[styles.expenseText, { color: activeTheme.textSecondary }]}>Despesas</Text>
              <Text style={[styles.expenseValue, { color: activeTheme.expense }]}>- R$ {CurrencyUtils.formatDisplay(balance.expense)}</Text>
            </View>
          </View>
        </View>

        {/* Renderização Dinâmica dos Módulos baseada na Ordem */}
        {homeOrder.map((modKey) => {
          if (modKey === 'accounts' && uiConfig.homeShowAccounts !== false) {
            return <HomeAccountsList key="accounts" accountBalances={accountBalances} activeTheme={activeTheme} styles={styles} navigation={navigation} />;
          }

          if (modKey === 'creditCards' && uiConfig.homeShowCreditCards !== false) {
            return <HomeCreditCardsList key="creditCards" accountBalances={accountBalances} activeTheme={activeTheme} styles={styles} navigation={navigation} />;
          }
          
          if (modKey === 'pending' && uiConfig.homeShowPending !== false) {
            return (
              <HomePendingTx
                key="pending"
                displayPendingList={displayPendingList}
                activeTheme={activeTheme}
                styles={styles}
                categoryList={categoryList}
                debtsList={debtsList}
                updateTransaction={updateTransaction}
                removeTransaction={removeTransaction}
                loadAccounts={loadAccounts}
                loadDebts={loadDebts}
                setEditingTx={setEditingTx}
                setModalVisible={setModalVisible}
              />
            );
          }

          if (modKey === 'recent' && uiConfig.homeShowRecent !== false) {
            return (
              <HomeRecentTx
                key="recent"
                recentTxList={recentTxList}
                activeTheme={activeTheme}
                styles={styles}
                categoryList={categoryList}
                debtsList={debtsList}
                updateTransaction={updateTransaction}
                removeTransaction={removeTransaction}
                loadAccounts={loadAccounts}
                loadDebts={loadDebts}
                setEditingTx={setEditingTx}
                setModalVisible={setModalVisible}
              />
            );
          }

          if (modKey === 'debts' && uiConfig.homeShowDebts !== false) {
            return <HomeDebts key="debts" debtsList={debtsList} activeTheme={activeTheme} styles={styles} navigation={navigation} />;
          }
          
          return null;
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: activeTheme.accent }]} onPress={() => { setEditingTx(null); setModalVisible(true); }}>
        <Ionicons name="add" size={32} color="#121212" />
      </TouchableOpacity>

      <TransactionModal 
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditingTx(null); }}
        onSave={saveTransaction}
        onDelete={async (tx) => {
          if (tx.recurrenceId) {
            await updateTransaction(tx.id, { isIgnored: 1 });
          } else {
            await removeTransaction(tx.id);
          }
          await loadAccounts();
          await loadDebts();
        }}
        initialData={editingTx}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  
  return StyleSheet.create({
    container: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 * z },
    headerTitle: { fontSize: 24 * z, fontWeight: 'bold', fontFamily: f },
    periodBox: { flexDirection: 'row', borderRadius: 4 * z, padding: 4 * z },
    periodText: { paddingHorizontal: 12 * z, paddingVertical: 6 * z, fontWeight: 'bold', fontFamily: f, fontSize: 14 * z },
    summaryCard: { borderRadius: 4 * z, padding: 24 * z, marginBottom: 24 * z },
    summaryTitle: { fontSize: 16 * z, fontFamily: f },
    summaryAmount: { fontSize: 36 * z, fontWeight: 'bold', marginVertical: 8 * z, fontFamily: f },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 * z },
    incomeBox: { flex: 1 },
    expenseBox: { flex: 1, alignItems: 'flex-end' },
    incomeText: { fontSize: 14 * z, fontFamily: f },
    expenseText: { fontSize: 14 * z, fontFamily: f },
    incomeValue: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
    expenseValue: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
    section: { marginBottom: 24 * z },
    sectionTitle: { fontSize: 18 * z, fontWeight: 'bold', marginBottom: 12 * z, fontFamily: f },
    
    groupedContainer: { borderRadius: 4 * z, overflow: 'hidden' },
    groupedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 * z },
    groupedIcon: { width: 32 * z, height: 32 * z, borderRadius: 4 * z, justifyContent: 'center', alignItems: 'center', marginRight: 12 * z },
    groupedText: { fontSize: 16 * z, fontWeight: '600', fontFamily: f },
    groupedAmount: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    
    fab: { position: 'absolute', right: 20 * z, bottom: 20 * z, width: 60 * z, height: 60 * z, borderRadius: 6 * z, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 6 * z, borderTopRightRadius: 6 * z, padding: 24 * z, minHeight: 300 * z },
    modalTitle: { fontSize: 20 * z, fontWeight: 'bold', marginBottom: 16 * z, fontFamily: f },
    toggleContainer: { flexDirection: 'row', borderRadius: 4 * z, padding: 4 * z, marginBottom: 24 * z },
    toggleBtn: { flex: 1, paddingVertical: 8 * z, alignItems: 'center', borderRadius: 4 * z },
    toggleText: { fontWeight: 'bold', fontFamily: f, fontSize: 14 * z },
    inputAmount: { fontSize: 40 * z, fontWeight: 'bold', marginBottom: 20 * z, textAlign: 'center', fontFamily: f },
    inputDesc: { padding: 16 * z, borderRadius: 4 * z, fontSize: 16 * z, marginBottom: 24 * z, fontFamily: f },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
    btnCancel: { flex: 1, padding: 16 * z, borderRadius: 4 * z, marginRight: 8 * z, alignItems: 'center' },
    btnSave: { flex: 1, padding: 16 * z, borderRadius: 4 * z, marginLeft: 8 * z, alignItems: 'center' },
    btnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    
    accountSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 * z },
    accountLabel: { marginRight: 12 * z, fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },
    accountPill: { paddingHorizontal: 12 * z, paddingVertical: 8 * z, borderRadius: 4 * z, marginRight: 8 * z },
    accountPillText: { fontSize: 12 * z, fontFamily: f }
  });
};
