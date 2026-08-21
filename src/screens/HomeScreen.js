import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Image } from 'react-native';
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
  const homeOrderRaw = uiConfig.homeModulesOrder || ['accounts', 'pending', 'recent'];
  const homeOrder = homeOrderRaw.includes('debts') ? homeOrderRaw : [...homeOrderRaw, 'debts'];

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
          <Text style={[styles.summaryAmount, { color: activeTheme.text }]}>R$ {balance.total.toFixed(2)}</Text>
          
          <View style={styles.row}>
            <View style={styles.incomeBox}>
              <Text style={[styles.incomeText, { color: activeTheme.textSecondary }]}>Receitas</Text>
              <Text style={[styles.incomeValue, { color: activeTheme.income }]}>+ R$ {balance.income.toFixed(2)}</Text>
            </View>
            <View style={styles.expenseBox}>
              <Text style={[styles.expenseText, { color: activeTheme.textSecondary }]}>Despesas</Text>
              <Text style={[styles.expenseValue, { color: activeTheme.expense }]}>- R$ {balance.expense.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Renderização Dinâmica dos Módulos baseada na Ordem */}
        {homeOrder.map((modKey) => {
          if (modKey === 'accounts' && uiConfig.homeShowAccounts !== false && accountBalances.length > 0) {
            return (
              <View key="accounts" style={styles.section}>
                <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Suas Contas</Text>
                <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
                  {accountBalances.map((acc, idx) => (
                    <View key={acc.id} style={[
                      styles.groupedItem, 
                      idx !== accountBalances.length - 1 && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }
                    ]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.groupedIcon, { backgroundColor: (acc.color || activeTheme.text) + '20' }]}>
                          {acc.icon && acc.icon.startsWith('http') ? (
                            <Image source={{ uri: acc.icon }} style={{ width: 18, height: 18, borderRadius: 4 }} />
                          ) : (
                            <Ionicons name={acc.icon || 'wallet-outline'} size={18} color={acc.color || activeTheme.text} />
                          )}
                        </View>
                        <Text style={[styles.groupedText, { color: activeTheme.text }]}>{acc.name}</Text>
                      </View>
                      <Text style={[styles.groupedAmount, { color: activeTheme.text }]}>R$ {acc.currentBalance.toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={[styles.groupedItem, { borderTopWidth: 1, borderTopColor: activeTheme.background, backgroundColor: activeTheme.card }]}>
                    <Text style={[styles.groupedText, { color: activeTheme.text, fontWeight: 'bold' }]}>Total Geral</Text>
                    <Text style={[styles.groupedAmount, { color: activeTheme.text, fontWeight: 'bold' }]}>
                      R$ {accountBalances.reduce((acc, curr) => acc + curr.currentBalance, 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }
          
          if (modKey === 'pending' && uiConfig.homeShowPending !== false && displayPendingList.length > 0) {
            return (
              <View key="pending" style={styles.section}>
                <Text style={[styles.sectionTitle, { color: activeTheme.expense }]}>Transações Pendentes</Text>
                <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
                  {displayPendingList.map((item, idx) => {
                    const catInfo = resolveCategory(item, categoryList);
                    const isLast = idx === displayPendingList.length - 1;
                    
                    return (
                      <SwipeableCard key={item.id} 
                        onDelete={async () => {
                          if (item.recurrenceId) {
                            await updateTransaction(item.id, { isIgnored: 1 });
                          } else {
                            await removeTransaction(item.id);
                          }
                          await loadAccounts();
                          await loadDebts();
                        }}
                        onAccept={async () => {
                          await updateTransaction(item.id, { isPending: 0 });
                          await loadAccounts();
                        }}
                      >
                        <TouchableOpacity activeOpacity={0.7} onPress={() => { setEditingTx(item); setModalVisible(true); }}>
                          <View style={[styles.groupedItem, { backgroundColor: activeTheme.card }, !isLast && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <View style={[styles.groupedIcon, { backgroundColor: activeTheme.expense + '20' }]}>
                                <Ionicons name="time" size={18} color={activeTheme.expense} />
                              </View>
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Text style={[styles.groupedText, { color: activeTheme.text, flexShrink: 1 }]} numberOfLines={1}>{item.description}</Text>
                                  {debtsList.some(d => d.transactionId === item.id) && (
                                    <Ionicons name="people" size={14} color={activeTheme.accent} style={{ marginLeft: 4 }} />
                                  )}
                                  {item.recurrenceId && (
                                    <Ionicons name="repeat" size={14} color={activeTheme.textSecondary} style={{ marginLeft: 4 }} />
                                  )}
                                </View>
                                <Text style={[{ color: activeTheme.textSecondary, fontSize: 11 }]} numberOfLines={1}>
                                  {new Date(item.date).toLocaleDateString('pt-BR')} {item.note ? `- ${item.note}` : ''}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.groupedAmount, { color: item.type === 'income' ? activeTheme.income : activeTheme.expense }]}>
                              {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </SwipeableCard>
                    );
                  })}
                </View>
              </View>
            );
          }

          if (modKey === 'recent' && uiConfig.homeShowRecent !== false) {
            return (
              <View key="recent" style={styles.section}>
                <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Últimas Transações</Text>
                
                {recentTxList.length === 0 && (
                  <Text style={{ color: activeTheme.textSecondary }}>Nenhuma transação confirmada ainda.</Text>
                )}

                {recentTxList.length > 0 && (
                  <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
                    {recentTxList.slice(0, 5).map((item, idx) => {
                      const catInfo = resolveCategory(item, categoryList);
                      const isLast = idx === Math.min(recentTxList.length, 5) - 1;
                      
                      return (
                        <SwipeableCard key={item.id} onDelete={async () => {
                          if (item.recurrenceId) {
                            await updateTransaction(item.id, { isIgnored: 1 });
                          } else {
                            await removeTransaction(item.id);
                          }
                          await loadAccounts();
                          await loadDebts();
                        }}>
                          <TouchableOpacity activeOpacity={0.7} onPress={() => { setEditingTx(item); setModalVisible(true); }}>
                            <View style={[styles.groupedItem, { backgroundColor: activeTheme.card }, !isLast && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={[styles.groupedIcon, { backgroundColor: catInfo.color + '20' }]}>
                                  <Ionicons name={catInfo.icon} size={18} color={catInfo.color} />
                                </View>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={[styles.groupedText, { color: activeTheme.text, flexShrink: 1 }]} numberOfLines={1}>{item.description}</Text>
                                    {debtsList.some(d => d.transactionId === item.id) && (
                                      <Ionicons name="people" size={14} color={activeTheme.accent} style={{ marginLeft: 4 }} />
                                    )}
                                    {item.recurrenceId && (
                                      <Ionicons name="repeat" size={14} color={activeTheme.textSecondary} style={{ marginLeft: 4 }} />
                                    )}
                                  </View>
                                  {item.note ? <Text style={[{ color: activeTheme.textSecondary, fontSize: 11 }]} numberOfLines={1}>{item.note}</Text> : null}
                                </View>
                              </View>
                              <Text style={[styles.groupedAmount, { color: item.type === 'income' ? activeTheme.income : activeTheme.expense }]}>
                                {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </SwipeableCard>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          }

          if (modKey === 'debts' && uiConfig.homeShowDebts !== false) {
            const totalOwe = debtsList.filter(d => d.type === 'owe').reduce((acc, d) => acc + d.amount, 0);
            const totalOwed = debtsList.filter(d => d.type === 'owed').reduce((acc, d) => acc + d.amount, 0);

            if (totalOwe === 0 && totalOwed === 0) return null;

            return (
              <View key="debts" style={styles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.sectionTitle, { color: activeTheme.text, marginBottom: 0 }]}>Dívidas</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Debts')}>
                    <Text style={{ color: activeTheme.accent, fontWeight: 'bold' }}>Ver Tudo</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Debts')}>
                    <View style={[styles.groupedItem, { borderBottomWidth: 1, borderBottomColor: activeTheme.background }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.groupedIcon, { backgroundColor: activeTheme.expense + '20' }]}>
                          <Ionicons name="arrow-up" size={18} color={activeTheme.expense} />
                        </View>
                        <Text style={[styles.groupedText, { color: activeTheme.text }]}>Eu Devo</Text>
                      </View>
                      <Text style={[styles.groupedAmount, { color: activeTheme.expense }]}>R$ {totalOwe.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Debts')}>
                    <View style={styles.groupedItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.groupedIcon, { backgroundColor: activeTheme.income + '20' }]}>
                          <Ionicons name="arrow-down" size={18} color={activeTheme.income} />
                        </View>
                        <Text style={[styles.groupedText, { color: activeTheme.text }]}>Me Devem</Text>
                      </View>
                      <Text style={[styles.groupedAmount, { color: activeTheme.income }]}>R$ {totalOwed.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            );
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
    periodBox: { flexDirection: 'row', borderRadius: 20 * z, padding: 4 * z },
    periodText: { paddingHorizontal: 12 * z, paddingVertical: 6 * z, fontWeight: 'bold', fontFamily: f, fontSize: 14 * z },
    summaryCard: { borderRadius: 16 * z, padding: 24 * z, marginBottom: 24 * z },
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
    
    groupedContainer: { borderRadius: 16 * z, overflow: 'hidden' },
    groupedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 * z },
    groupedIcon: { width: 32 * z, height: 32 * z, borderRadius: 16 * z, justifyContent: 'center', alignItems: 'center', marginRight: 12 * z },
    groupedText: { fontSize: 16 * z, fontWeight: '600', fontFamily: f },
    groupedAmount: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    
    fab: { position: 'absolute', right: 20 * z, bottom: 20 * z, width: 60 * z, height: 60 * z, borderRadius: 30 * z, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 20 * z, borderTopRightRadius: 20 * z, padding: 24 * z, minHeight: 300 * z },
    modalTitle: { fontSize: 20 * z, fontWeight: 'bold', marginBottom: 16 * z, fontFamily: f },
    toggleContainer: { flexDirection: 'row', borderRadius: 8 * z, padding: 4 * z, marginBottom: 24 * z },
    toggleBtn: { flex: 1, paddingVertical: 8 * z, alignItems: 'center', borderRadius: 6 * z },
    toggleText: { fontWeight: 'bold', fontFamily: f, fontSize: 14 * z },
    inputAmount: { fontSize: 40 * z, fontWeight: 'bold', marginBottom: 20 * z, textAlign: 'center', fontFamily: f },
    inputDesc: { padding: 16 * z, borderRadius: 12 * z, fontSize: 16 * z, marginBottom: 24 * z, fontFamily: f },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
    btnCancel: { flex: 1, padding: 16 * z, borderRadius: 12 * z, marginRight: 8 * z, alignItems: 'center' },
    btnSave: { flex: 1, padding: 16 * z, borderRadius: 12 * z, marginLeft: 8 * z, alignItems: 'center' },
    btnText: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },
    
    accountSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 * z },
    accountLabel: { marginRight: 12 * z, fontSize: 14 * z, fontWeight: 'bold', fontFamily: f },
    accountPill: { paddingHorizontal: 12 * z, paddingVertical: 8 * z, borderRadius: 16 * z, marginRight: 8 * z },
    accountPillText: { fontSize: 12 * z, fontFamily: f }
  });
};
