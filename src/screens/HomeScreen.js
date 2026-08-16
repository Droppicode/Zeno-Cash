import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Simulação de transações pendentes
  const [pending, setPending] = useState([
    { id: '1', desc: 'Uber do Brasil', amount: '24,90' },
    { id: '2', desc: 'Ifood', amount: '65,00' }
  ]);

  const approveTransaction = (id) => {
    // Aqui vai salvar no banco (Drizzle) e remover da fila de pendentes
    setPending(current => current.filter(item => item.id !== id));
  };

  const renderRightActions = (id) => (
    <TouchableOpacity 
      style={styles.approveAction}
      onPress={() => approveTransaction(id)}
    >
      <Ionicons name="checkmark-circle" size={24} color="#fff" />
      <Text style={styles.approveActionText}>Aprovar</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Resumo de Saldos */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Saldo Total</Text>
          <Text style={styles.summaryAmount}>R$ 14.520,00</Text>
          
          <View style={styles.row}>
            <View style={styles.incomeBox}>
              <Text style={styles.incomeText}>Receitas</Text>
              <Text style={styles.incomeValue}>+ R$ 5.200</Text>
            </View>
            <View style={styles.expenseBox}>
              <Text style={styles.expenseText}>Despesas</Text>
              <Text style={styles.expenseValue}>- R$ 1.800</Text>
            </View>
          </View>
        </View>

        {/* Pendências com Gesto */}
        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transações Pendentes ({pending.length})</Text>
            {pending.map(item => (
              <Swipeable
                key={item.id}
                renderRightActions={() => renderRightActions(item.id)}
                overshootRight={false}
              >
                <View style={styles.pendingCard}>
                  <Text style={styles.pendingText}>{item.desc} - R$ {item.amount}</Text>
                  <Text style={styles.pendingHint}>&lt;&lt; Deslize para a esquerda para aprovar</Text>
                </View>
              </Swipeable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botão Flutuante (FAB) para Nova Transação */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Modal Super Rápido */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Transação</Text>
            
            <TextInput 
              style={styles.inputAmount}
              placeholder="R$ 0,00"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />

            <TextInput 
              style={styles.inputDesc}
              placeholder="Descrição ou Estabelecimento"
              placeholderTextColor="#888"
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.btnSave} 
                onPress={() => {
                  setModalVisible(false);
                  setAmount('');
                  setDescription('');
                }}
              >
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  summaryCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
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
  pendingCard: {
    backgroundColor: '#2C2C2C',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  pendingText: { color: '#fff', fontSize: 16 },
  pendingHint: { color: '#888', fontSize: 12, marginTop: 4 },
  approveAction: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  approveActionText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#BB86FC',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 300,
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 24 },
  inputAmount: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputDesc: {
    backgroundColor: '#2C2C2C',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btnCancel: {
    flex: 1,
    padding: 16,
    backgroundColor: '#333',
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  btnSave: {
    flex: 1,
    padding: 16,
    backgroundColor: '#BB86FC',
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
