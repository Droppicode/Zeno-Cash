import React, { useState, useContext, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsContext } from '../context/SettingsContext';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { resolveCategory } from '../services/categorizer';
import SwipeableCard from '../components/ui/SwipeableCard';
import TransactionModal from '../components/TransactionModal';
import PayInvoiceModal from '../components/PayInvoiceModal';
import { getZoomFactor } from '../utils/scaler';
import { InvoiceUtils } from '../utils/InvoiceUtils';

export default function CreditCardScreen({ route, navigation }) {
  const { account } = route.params;
  const { activeTheme } = useContext(SettingsContext);
  const { txList, loadTransactions, saveTransaction, removeTransaction } = useTransactions();
  const { categoryList, loadCategories } = useCategories();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  
  const [payModalVisible, setPayModalVisible] = useState(false);

  const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);

  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, []);

  const cardTransactions = useMemo(() => {
    return txList.filter(t => t.accountId === account.id && t.isPending !== 1 && t.isIgnored !== 1);
  }, [txList, account.id]);

  const invoices = useMemo(() => {
    return InvoiceUtils.groupTransactionsByInvoice(cardTransactions, account.closingDay);
  }, [cardTransactions, account.closingDay]);

  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState(0);

  useEffect(() => {
    if (invoices.length > 0 && currentInvoiceIndex === 0 && !invoices._init) {
      const { currentInvoiceKey } = InvoiceUtils.getCurrentInvoiceCycle(account.closingDay);
      const idx = invoices.findIndex(i => i.monthKey === currentInvoiceKey);
      if (idx !== -1) {
        setCurrentInvoiceIndex(idx);
      } else {
        setCurrentInvoiceIndex(invoices.length - 1);
      }
      invoices._init = true;
    }
  }, [invoices, account.closingDay]);

  const handleNextInvoice = () => {
    if (currentInvoiceIndex < invoices.length - 1) setCurrentInvoiceIndex(currentInvoiceIndex + 1);
  };
  const handlePrevInvoice = () => {
    if (currentInvoiceIndex > 0) setCurrentInvoiceIndex(currentInvoiceIndex - 1);
  };

  const currentInvoice = invoices[currentInvoiceIndex] || { monthKey: 'N/A', closingBalance: 0, cycleExpenses: 0, cyclePayments: 0, previousBalance: 0, transactions: [] };

  const handleAddInterest = () => {
    setEditingTx({
      type: 'expense',
      accountId: account.id,
      description: 'Juros/Multa Fatura Anterior',
      date: Date.now()
    });
    setModalVisible(true);
  };

  const handlePayInvoice = () => {
    if (!account.associatedAccountId) {
      Alert.alert('Erro', 'Este cartão não possui uma conta corrente associada para o pagamento da fatura. Configure na aba de Contas.');
      return;
    }
    setPayModalVisible(true);
  };

  const executePayment = async (amount) => {
    setPayModalVisible(false);
    
    // 1. Expense on checking
    await saveTransaction(null, {
      amount: amount,
      description: `Pagamento Fatura ${account.name}`,
      type: 'expense',
      accountId: account.associatedAccountId,
      date: Date.now()
    });
    // 2. Income on credit card
    await saveTransaction(null, {
      amount: amount,
      description: `Pagamento de Fatura`,
      type: 'income',
      accountId: account.id,
      date: Date.now()
    });
    
    Alert.alert('Sucesso', 'Pagamento registrado com sucesso!');
  };

  const formatMonthKey = (key) => {
    if (key === 'N/A') return 'Nenhuma fatura';
    const [y, m] = key.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <View style={[styles.header, { backgroundColor: activeTheme.card }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={activeTheme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: activeTheme.text }]}>{account.name}</Text>
          <Text style={{ color: activeTheme.textSecondary, fontSize: 12 }}>Limite: R$ {account.creditLimit?.toFixed(2)}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {invoices.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="card-outline" size={64} color={activeTheme.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
          <Text style={{ color: activeTheme.textSecondary, fontSize: 16, textAlign: 'center' }}>Nenhuma transação registrada neste cartão ainda.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          <View style={[styles.invoiceHeader, { backgroundColor: activeTheme.card }]}>
            <View style={styles.invoiceSelector}>
              <TouchableOpacity onPress={handlePrevInvoice} disabled={currentInvoiceIndex === 0} style={{ padding: 8, opacity: currentInvoiceIndex === 0 ? 0.3 : 1 }}>
                <Ionicons name="chevron-back" size={24} color={activeTheme.text} />
              </TouchableOpacity>
              
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.invoiceMonth, { color: activeTheme.text }]}>{formatMonthKey(currentInvoice.monthKey)}</Text>
                <Text style={{ color: activeTheme.textSecondary, fontSize: 12 }}>Vencimento dia {account.dueDay}</Text>
              </View>

              <TouchableOpacity onPress={handleNextInvoice} disabled={currentInvoiceIndex === invoices.length - 1} style={{ padding: 8, opacity: currentInvoiceIndex === invoices.length - 1 ? 0.3 : 1 }}>
                <Ionicons name="chevron-forward" size={24} color={activeTheme.text} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginVertical: 16 }}>
              <Text style={{ color: activeTheme.textSecondary, fontSize: 14 }}>Total da Fatura</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={[styles.invoiceTotal, { color: currentInvoice.closingBalance > 0 ? activeTheme.expense : activeTheme.income }]}>
                  R$ {Math.max(0, currentInvoice.cycleExpenses - currentInvoice.cyclePayments).toFixed(2)}
                </Text>
                {currentInvoice.previousBalance > 0 && (
                  <Text style={[styles.invoiceTotal, { color: activeTheme.textSecondary, fontSize: 18, marginLeft: 8 }]}>
                    + R$ {currentInvoice.previousBalance.toFixed(2)}
                  </Text>
                )}
              </View>
            </View>

            {currentInvoice.closingBalance > 0 && currentInvoice.monthKey >= InvoiceUtils.getCurrentInvoiceCycle(account.closingDay).currentInvoiceKey && (
              <TouchableOpacity style={[styles.payBtn, { backgroundColor: activeTheme.accent }]} onPress={handlePayInvoice}>
                <Text style={{ color: '#121212', fontWeight: 'bold', fontSize: 16 }}>Pagar Fatura</Text>
              </TouchableOpacity>
            )}
          </View>

          {currentInvoice.previousBalance > 0 && (
            <View style={[styles.warningBox, { backgroundColor: activeTheme.expense + '20', borderColor: activeTheme.expense }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="alert-circle" size={20} color={activeTheme.expense} style={{ marginRight: 8 }} />
                <Text style={{ color: activeTheme.text, fontWeight: 'bold', flex: 1 }}>Fatura Anterior em Aberto</Text>
              </View>
              <Text style={{ color: activeTheme.textSecondary, fontSize: 13, marginBottom: 12 }}>
                O saldo pendente da fatura anterior (R$ {currentInvoice.previousBalance.toFixed(2)}) foi acumulado nesta fatura. Lembre-se de adicionar eventuais juros.
              </Text>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeTheme.expense }]} onPress={handleAddInterest}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Adicionar Juros/Multa</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.txList}>
            <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Transações da Fatura</Text>
            
            {/* Fake Transaction for Rollover */}
            {currentInvoice.previousBalance > 0 && (
              <View style={[styles.groupedItem, { backgroundColor: activeTheme.card, borderBottomWidth: 1, borderBottomColor: activeTheme.background }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.groupedIcon, { backgroundColor: activeTheme.expense + '20' }]}>
                    <Ionicons name="receipt" size={18} color={activeTheme.expense} />
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.groupedText, { color: activeTheme.text }]} numberOfLines={1}>Saldo Fatura Anterior</Text>
                    <Text style={{ color: activeTheme.textSecondary, fontSize: 11 }}>
                      Acumulado automaticamente
                    </Text>
                  </View>
                </View>
                <Text style={[styles.groupedAmount, { color: activeTheme.expense }]}>
                  - R$ {currentInvoice.previousBalance.toFixed(2)}
                </Text>
              </View>
            )}

            {currentInvoice.transactions.map((item, idx) => {
              const catInfo = resolveCategory(item, categoryList);
              return (
                <SwipeableCard key={item.id} onDelete={() => removeTransaction(item.id)}>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => { setEditingTx(item); setModalVisible(true); }}>
                    <View style={[styles.groupedItem, { backgroundColor: activeTheme.card }, idx !== currentInvoice.transactions.length - 1 && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.groupedIcon, { backgroundColor: catInfo.color + '20' }]}>
                          <Ionicons name={catInfo.icon} size={18} color={catInfo.color} />
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.groupedText, { color: activeTheme.text }]} numberOfLines={1}>{item.description}</Text>
                          <Text style={{ color: activeTheme.textSecondary, fontSize: 11 }}>
                            {new Date(item.date).toLocaleDateString('pt-BR')}
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
        </ScrollView>
      )}



      <TransactionModal 
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditingTx(null); }}
        onSave={async (data) => {
          await saveTransaction(data.id, data);
          setModalVisible(false);
          setEditingTx(null);
        }}
        initialData={editingTx}
      />
      
      <PayInvoiceModal 
        visible={payModalVisible} 
        onClose={() => setPayModalVisible(false)} 
        invoice={currentInvoice} 
        onPay={executePayment} 
      />
    </SafeAreaView>
  );
}

const getStyles = (theme) => {
  const z = getZoomFactor(theme);
  const f = theme.fontFamily || 'monospace';
  
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16 * z, borderBottomWidth: 1, borderBottomColor: theme.cardSecondary },
    backBtn: { width: 40 * z, height: 40 * z, justifyContent: 'center' },
    title: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f },
    
    invoiceHeader: { padding: 24 * z, borderBottomLeftRadius: 24 * z, borderBottomRightRadius: 24 * z, marginBottom: 16 * z, elevation: 2 },
    invoiceSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    invoiceMonth: { fontSize: 18 * z, fontWeight: 'bold', fontFamily: f, textTransform: 'capitalize' },
    invoiceTotal: { fontSize: 40 * z, fontWeight: 'bold', fontFamily: f, marginTop: 4 * z },
    payBtn: { padding: 16 * z, borderRadius: 12 * z, alignItems: 'center', marginTop: 12 * z },

    warningBox: { marginHorizontal: 16 * z, padding: 16 * z, borderRadius: 12 * z, borderWidth: 1, marginBottom: 16 * z },
    actionBtn: { padding: 10 * z, borderRadius: 8 * z, alignItems: 'center', alignSelf: 'flex-start' },

    txList: { paddingHorizontal: 16 * z, paddingBottom: 100 * z },
    sectionTitle: { fontSize: 18 * z, fontWeight: 'bold', marginBottom: 12 * z, fontFamily: f },
    
    groupedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 * z, borderRadius: 12 * z },
    groupedIcon: { width: 32 * z, height: 32 * z, borderRadius: 16 * z, justifyContent: 'center', alignItems: 'center', marginRight: 12 * z },
    groupedText: { fontSize: 16 * z, fontWeight: '600', fontFamily: f },
    groupedAmount: { fontSize: 16 * z, fontWeight: 'bold', fontFamily: f },

    fab: { position: 'absolute', right: 20 * z, bottom: 20 * z, width: 60 * z, height: 60 * z, borderRadius: 30 * z, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  });
};
