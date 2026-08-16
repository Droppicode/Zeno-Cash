import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../database/db';
import { transactions } from '../database/schema';
import { desc, eq } from 'drizzle-orm';
import { categorizeTransaction } from '../services/categorizer';

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [txType, setTxType] = useState('expense');
  const [period, setPeriod] = useState('30d'); // Adicionado o state
  
  // Estado real do Banco de Dados
  const [txList, setTxList] = useState([]);
  const [balance, setBalance] = useState({ total: 0, income: 0, expense: 0 });

  const loadData = async () => {
    try {
      // Busca no DB nativo via Drizzle ORM
      const data = await db.select().from(transactions).orderBy(desc(transactions.date));
      
      const now = new Date().getTime();
      let limitDate = 0;
      
      if (period === '30d') {
        limitDate = now - (30 * 24 * 60 * 60 * 1000);
      } else if (period === '90d') {
        limitDate = now - (90 * 24 * 60 * 60 * 1000);
      }

      // Filtra de acordo com o período
      const filteredData = data.filter(t => t.date >= limitDate);
      
      // A lista principal sempre terá todos os dados (para pegar as 5 últimas)
      setTxList(data);
      
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

  useEffect(() => {
    loadData();
  }, [period]); // Recarrega se o período mudar

  const saveTransaction = async () => {
    if (!amount || !description.trim()) return;
    
    let rawAmount = amount.replace(',', '.').replace(/[^0-9.]/g, '');
    let numAmount = parseFloat(rawAmount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor, insira um valor numérico válido maior que zero.');
      return;
    }
    
    // Categorizador roda em milisegundos (apenas para ícones/cores agora)
    const cat = categorizeTransaction(description, amount);
    
    // Salva direto no sqlite usando o tipo selecionado no toggle
    const finalType = txType;
    
    await db.insert(transactions).values({
      amount: numAmount,
      description: description.trim(),
      type: finalType,
      date: Date.now(),
    });
    
    setModalVisible(false);
    setAmount('');
    setDescription('');
    setTxType('expense'); // reseta pro padrão
    loadData();
  };

  const approvePending = async (tx) => {
    // Exemplo de aprovação (como se viesse de fora)
    // Atualmente só deleta para sumir da lista se fossemos usar uma tabela separada.
    // Como estamos lendo tudo de transactions, o "aprovar" aqui fará um "delete" 
    // apenas para manter a dinâmica do Swipeable que você gostou.
    await db.delete(transactions).where(eq(transactions.id, tx.id));
    loadData();
  };

  const renderRightActions = (tx) => (
    <TouchableOpacity 
      style={styles.approveAction}
      onPress={() => approvePending(tx)}
    >
      <Ionicons name="trash" size={24} color="#fff" />
      <Text style={styles.approveActionText}>Apagar</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Filtro Temporal na Home */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Visão Geral</Text>
          <View style={styles.periodBox}>
            <TouchableOpacity onPress={() => setPeriod('30d')}>
              <Text style={[styles.periodText, period === '30d' && styles.periodTextActive]}>30D</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPeriod('90d')}>
              <Text style={[styles.periodText, period === '90d' && styles.periodTextActive]}>90D</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPeriod('all')}>
              <Text style={[styles.periodText, period === 'all' && styles.periodTextActive]}>Tudo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumo Dinâmico */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Saldo Total</Text>
          <Text style={styles.summaryAmount}>R$ {balance.total.toFixed(2)}</Text>
          
          <View style={styles.row}>
            <View style={styles.incomeBox}>
              <Text style={styles.incomeText}>Receitas</Text>
              <Text style={styles.incomeValue}>+ R$ {balance.income.toFixed(2)}</Text>
            </View>
            <View style={styles.expenseBox}>
              <Text style={styles.expenseText}>Despesas</Text>
              <Text style={styles.expenseValue}>- R$ {balance.expense.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Lista Real conectada no Banco */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimas 5 Transações</Text>
          
          {txList.length === 0 && (
            <Text style={{ color: '#888' }}>Nenhuma transação ainda. Adicione uma no botão +</Text>
          )}

          {txList.slice(0, 5).map(item => {
            const catInfo = categorizeTransaction(item.description, item.amount);
            
            return (
              <Swipeable
                key={item.id}
                renderRightActions={() => renderRightActions(item)}
                overshootRight={false}
              >
                <View style={styles.pendingCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={catInfo.icon} size={20} color={catInfo.color} style={{ marginRight: 8 }} />
                    <Text style={styles.pendingText}>{item.description}</Text>
                  </View>
                  <Text style={[
                    styles.pendingText, 
                    { color: item.type === 'income' ? '#4CAF50' : '#F44336', fontWeight: 'bold' }
                  ]}>
                    {item.type === 'income' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                  </Text>
                </View>
              </Swipeable>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Modal Real de Cadastro */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Transação</Text>
            
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleBtn, txType === 'expense' && styles.toggleBtnActiveExpense]} 
                onPress={() => setTxType('expense')}
              >
                <Text style={[styles.toggleText, txType === 'expense' && styles.toggleTextActive]}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, txType === 'income' && styles.toggleBtnActiveIncome]} 
                onPress={() => setTxType('income')}
              >
                <Text style={[styles.toggleText, txType === 'income' && styles.toggleTextActive]}>Receita</Text>
              </TouchableOpacity>
            </View>

            <TextInput 
              style={styles.inputAmount}
              placeholder="0,00"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />

            <TextInput 
              style={styles.inputDesc}
              placeholder="Ex: Uber, Ifood, Salário..."
              placeholderTextColor="#888"
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={saveTransaction}>
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  periodBox: { flexDirection: 'row', backgroundColor: '#2C2C2C', borderRadius: 20, padding: 4 },
  periodText: { color: '#888', paddingHorizontal: 12, paddingVertical: 6, fontWeight: 'bold' },
  periodTextActive: { color: '#fff', backgroundColor: '#BB86FC', borderRadius: 16 },
  summaryCard: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 24, marginBottom: 24 },
  summaryTitle: { color: '#888', fontSize: 16 },
  summaryAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  incomeBox: { flex: 1 },
  expenseBox: { flex: 1, alignItems: 'flex-end' },
  incomeText: { color: '#888', fontSize: 14 },
  expenseText: { color: '#888', fontSize: 14 },
  incomeValue: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  expenseValue: { color: '#F44336', fontSize: 18, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  pendingCard: { backgroundColor: '#2C2C2C', padding: 16, marginBottom: 8, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pendingText: { color: '#fff', fontSize: 16 },
  approveAction: { backgroundColor: '#F44336', justifyContent: 'center', alignItems: 'center', width: 80, marginBottom: 8, borderRadius: 8, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  approveActionText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#BB86FC', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, minHeight: 300 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#2C2C2C', borderRadius: 8, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActiveExpense: { backgroundColor: '#F44336' },
  toggleBtnActiveIncome: { backgroundColor: '#4CAF50' },
  toggleText: { color: '#888', fontWeight: 'bold' },
  toggleTextActive: { color: '#fff' },
  inputAmount: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  inputDesc: { backgroundColor: '#2C2C2C', color: '#fff', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  btnCancel: { flex: 1, padding: 16, backgroundColor: '#333', borderRadius: 12, marginRight: 8, alignItems: 'center' },
  btnSave: { flex: 1, padding: 16, backgroundColor: '#BB86FC', borderRadius: 12, marginLeft: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
