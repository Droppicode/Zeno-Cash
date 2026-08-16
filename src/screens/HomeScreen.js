import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../database/db';
import { transactions, accounts } from '../database/schema';
import { desc, eq } from 'drizzle-orm';
import { categorizeTransaction } from '../services/categorizer';
import { SettingsContext } from '../context/SettingsContext';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {
  const { activeTheme, uiConfig, defaultPeriod } = React.useContext(SettingsContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [txType, setTxType] = useState('expense');
  const [period, setPeriod] = useState(defaultPeriod || '30d');
  
  // Estado real do Banco de Dados
  const [txList, setTxList] = useState([]);
  const [balance, setBalance] = useState({ total: 0, income: 0, expense: 0 });
  const [accountBalances, setAccountBalances] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const styles = React.useMemo(() => getStyles(activeTheme), [activeTheme]);

  const loadData = async () => {
    try {
      const allTx = await db.select().from(transactions).orderBy(desc(transactions.date));
      const accData = await db.select().from(accounts);
      
      // Calculate current balances for accounts based on ALL transactions
      const calculatedAccounts = accData.map(acc => {
        let current = acc.balance || 0;
        allTx.forEach(tx => {
          if (tx.accountId === acc.id) {
             if (tx.type === 'income') current += tx.amount;
             else current -= tx.amount;
          }
        });
        return { ...acc, currentBalance: current };
      });
      
      setAccountBalances(calculatedAccounts);
      if (accData.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accData[0].id);
      }
      
      const now = new Date().getTime();
      let limitDate = 0;
      
      if (period === '30d') {
        limitDate = now - (30 * 24 * 60 * 60 * 1000);
      } else if (period === '90d') {
        limitDate = now - (90 * 24 * 60 * 60 * 1000);
      }

      const filteredData = allTx.filter(t => t.date >= limitDate);
      
      setTxList(allTx);
      
      let inTotal = 0;
      let outTotal = 0;
      filteredData.forEach(t => {
        if (t.type === 'income') inTotal += t.amount;
        else outTotal += t.amount;
      });
      
      setBalance({ total: inTotal - outTotal, income: inTotal, expense: outTotal });
    } catch (err) {
      console.log('Erro db:', err);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [period])
  );

  const saveTransaction = async () => {
    if (!amount || !description.trim()) return;
    
    let rawAmount = amount.replace(',', '.').replace(/[^0-9.]/g, '');
    let numAmount = parseFloat(rawAmount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor, insira um valor numérico válido maior que zero.');
      return;
    }
    
    const finalType = txType;
    
    await db.insert(transactions).values({
      amount: numAmount,
      description: description.trim(),
      type: finalType,
      date: Date.now(),
      accountId: selectedAccountId
    });
    
    setModalVisible(false);
    setAmount('');
    setDescription('');
    setTxType('expense');
    loadData();
  };

  const approvePending = async (tx) => {
    await db.delete(transactions).where(eq(transactions.id, tx.id));
    loadData();
  };

  const renderRightActions = (tx) => (
    <TouchableOpacity 
      style={[styles.approveAction, { backgroundColor: activeTheme.expense }]}
      onPress={() => approvePending(tx)}
    >
      <Ionicons name="trash" size={24} color="#fff" />
      <Text style={styles.approveActionText}>Apagar</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 * 0.8 * (activeTheme.zoom || 1) }}>
        {/* Filtro Temporal na Home */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: activeTheme.text }]}>Visão Geral</Text>
          <View style={[styles.periodBox, { backgroundColor: activeTheme.cardSecondary }]}>
            <TouchableOpacity onPress={() => setPeriod('30d')}>
              <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === '30d' && { color: '#121212', backgroundColor: activeTheme.accent, borderRadius: 16 }]}>30D</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPeriod('90d')}>
              <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === '90d' && { color: '#121212', backgroundColor: activeTheme.accent, borderRadius: 16 }]}>90D</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPeriod('all')}>
              <Text style={[styles.periodText, { color: activeTheme.textSecondary }, period === 'all' && { color: '#121212', backgroundColor: activeTheme.accent, borderRadius: 16 }]}>Tudo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumo Dinâmico (Total do Período) */}
        <View style={[styles.summaryCard, { backgroundColor: activeTheme.card }]}>
          <Text style={[styles.summaryTitle, { color: activeTheme.textSecondary }]}>Balanço do Período</Text>
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

        {/* Saldos das Contas (Novo Layout Agrupado) */}
        {accountBalances.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Suas Contas</Text>
            <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
              {accountBalances.map((acc, idx) => (
                <View key={acc.id} style={[
                  styles.groupedItem, 
                  idx !== accountBalances.length - 1 && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.groupedIcon, { backgroundColor: (acc.color || activeTheme.text) + '20' }]}>
                      <Ionicons name={acc.icon || 'wallet-outline'} size={18} color={acc.color || activeTheme.text} />
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
        )}

        {/* Lista Real conectada no Banco (Layout Agrupado) */}
        {uiConfig.homeShowPending !== false && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Últimas Transações</Text>
            
            {txList.length === 0 && (
              <Text style={{ color: activeTheme.textSecondary }}>Nenhuma transação ainda. Adicione uma no botão +</Text>
            )}

            {txList.length > 0 && (
              <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
                {txList.slice(0, 5).map((item, idx) => {
                  const catInfo = categorizeTransaction(item.description, item.amount);
                  const isLast = idx === Math.min(txList.length, 5) - 1;
                  
                  return (
                    <Swipeable
                      key={item.id}
                      renderRightActions={() => renderRightActions(item)}
                      overshootRight={false}
                    >
                      <View style={[
                        styles.groupedItem,
                        !isLast && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }
                      ]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.groupedIcon, { backgroundColor: catInfo.color + '20' }]}>
                            <Ionicons name={catInfo.icon} size={18} color={catInfo.color} />
                          </View>
                          <Text style={[styles.groupedText, { color: activeTheme.text }]}>{item.description}</Text>
                        </View>
                        <Text style={[
                          styles.groupedAmount, 
                          { color: item.type === 'income' ? activeTheme.income : activeTheme.expense }
                        ]}>
                          {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                        </Text>
                      </View>
                    </Swipeable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: activeTheme.accent }]} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#121212" />
      </TouchableOpacity>

      {/* Modal Real de Cadastro */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: activeTheme.card }]}>
            <Text style={[styles.modalTitle, { color: activeTheme.text }]}>Nova Transação</Text>
            
            <View style={[styles.toggleContainer, { backgroundColor: activeTheme.cardSecondary }]}>
              <TouchableOpacity 
                style={[styles.toggleBtn, txType === 'expense' && { backgroundColor: activeTheme.expense }]} 
                onPress={() => setTxType('expense')}
              >
                <Text style={[styles.toggleText, { color: activeTheme.textSecondary }, txType === 'expense' && { color: '#fff' }]}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, txType === 'income' && { backgroundColor: activeTheme.income }]} 
                onPress={() => setTxType('income')}
              >
                <Text style={[styles.toggleText, { color: activeTheme.textSecondary }, txType === 'income' && { color: '#fff' }]}>Receita</Text>
              </TouchableOpacity>
            </View>

            <TextInput 
              style={[styles.inputAmount, { color: activeTheme.text }]}
              placeholder="0,00"
              placeholderTextColor={activeTheme.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />

            {accountBalances.length > 0 && (
              <View style={styles.accountSelector}>
                <Text style={[styles.accountLabel, { color: activeTheme.textSecondary }]}>Conta:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {accountBalances.map(acc => (
                    <TouchableOpacity 
                      key={acc.id} 
                      style={[
                        styles.accountPill, 
                        { backgroundColor: activeTheme.cardSecondary },
                        selectedAccountId === acc.id && { backgroundColor: activeTheme.accent }
                      ]}
                      onPress={() => setSelectedAccountId(acc.id)}
                    >
                      <Text style={[
                        styles.accountPillText, 
                        { color: activeTheme.textSecondary },
                        selectedAccountId === acc.id && { color: '#121212', fontWeight: 'bold' }
                      ]}>{acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TextInput 
              style={[styles.inputDesc, { backgroundColor: activeTheme.cardSecondary, color: activeTheme.text }]}
              placeholder="Ex: Uber, Ifood, Salário..."
              placeholderTextColor={activeTheme.textSecondary}
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btnCancel, { backgroundColor: activeTheme.cardSecondary }]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.btnText, { color: activeTheme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, { backgroundColor: activeTheme.accent }]} onPress={saveTransaction}>
                <Text style={[styles.btnText, { color: '#121212' }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme) => {
  const z = 0.8 * (theme.zoom || 1);
  const f = theme.fontFamily || 'monospace';
  
  return StyleSheet.create({
    container: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 * z },
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
    
    approveAction: { justifyContent: 'center', alignItems: 'center', width: 80 * z, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
    approveActionText: { color: '#fff', fontSize: 12 * z, fontWeight: 'bold', fontFamily: f },
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
