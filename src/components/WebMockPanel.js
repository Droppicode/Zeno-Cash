import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, DeviceEventEmitter, ScrollView } from 'react-native';
import { headlessNotificationListener } from '../services/NotificationListener';
import { seedDatabase } from '../database/seed';
import { materializeRecurrencesUpToToday } from '../services/BackgroundTasks';

export default function WebMockPanel() {
  if (Platform.OS !== 'web') return null;

  const simulateNubankNotification = async () => {
    const fakeNotification = {
      app: 'com.nubank',
      title: 'Transferência recebida',
      text: 'Você recebeu uma transferência de R$ 150,00 de Marcos.',
      time: Date.now()
    };
    await headlessNotificationListener({ notification: JSON.stringify(fakeNotification) });
    DeviceEventEmitter.emit('refreshTransactions');
    alert("Notificação simulada recebida e processada! Verifique a tela inicial.");
  };

  const simulateItauExpense = async () => {
    const fakeNotification = {
      app: 'com.itau',
      title: 'Compra aprovada',
      text: 'Compra aprovada no seu cartão Itaú no valor de R$ 45,90 em IFood.',
      time: Date.now()
    };
    await headlessNotificationListener({ notification: JSON.stringify(fakeNotification) });
    DeviceEventEmitter.emit('refreshTransactions');
    alert("Despesa simulada recebida e processada! Verifique a tela inicial.");
  };

  const simulateSalary = async () => {
    const fakeNotification = {
      app: 'com.itau',
      title: 'Transferência recebida',
      text: 'Você recebeu uma transferência de R$ 15.000,00 de Tech Co.',
      time: Date.now()
    };
    await headlessNotificationListener({ notification: JSON.stringify(fakeNotification) });
    DeviceEventEmitter.emit('refreshTransactions');
    alert("Salário simulado! Verifique a tela inicial.");
  };

  const simulateSubscription = async () => {
    const fakeNotification = {
      app: 'com.nubank',
      title: 'Compra aprovada',
      text: 'Compra aprovada no seu cartão Nubank no valor de R$ 55,90 em Netflix.',
      time: Date.now()
    };
    await headlessNotificationListener({ notification: JSON.stringify(fakeNotification) });
    DeviceEventEmitter.emit('refreshTransactions');
    alert("Assinatura simulada! Ela deve ser categorizada e gerar uma divisão de conta se configurado.");
  };

  const resetDatabase = async () => {
    if (confirm("Tem certeza que deseja apagar tudo e resetar com os dados Mock?")) {
      await seedDatabase(true);
      DeviceEventEmitter.emit('refreshTransactions');
      alert("Banco de dados resetado com sucesso!");
    }
  };

  const advanceTime = async () => {
    const msToAdvance = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (!global.timeOffset) global.timeOffset = 0;
    global.timeOffset += msToAdvance;
    
    if (!global.originalDate) {
      global.originalDate = Date;
      global.originalDateNow = Date.now;
      
      class MockDate extends global.originalDate {
        constructor(...args) {
          if (args.length === 0) {
            super(global.originalDateNow() + global.timeOffset);
          } else {
            super(...args);
          }
        }
      }
      MockDate.now = () => global.originalDateNow() + global.timeOffset;
      global.Date = MockDate;
    }
    
    await materializeRecurrencesUpToToday();
    DeviceEventEmitter.emit('refreshTransactions');
    alert("Você viajou 30 dias no tempo! Faturas e contas recorrentes devem aparecer pendentes.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Ambiente de Teste (Web)</Text>
      <Text style={styles.subtitle}>Painel de controle para facilitar as demonstrações.</Text>
      
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>Notificações / Automação</Text>
        
        <TouchableOpacity style={[styles.button, { backgroundColor: '#8A05BE' }]} onPress={simulateNubankNotification}>
          <Text style={styles.buttonText}>Simular Pix Nubank (R$ 150)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: '#EC7000' }]} onPress={simulateItauExpense}>
          <Text style={styles.buttonText}>Simular Compra Itaú (R$ 45,90)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: '#EC7000' }]} onPress={simulateSalary}>
          <Text style={styles.buttonText}>Simular Salário Itaú (R$ 15k)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: '#8A05BE' }]} onPress={simulateSubscription}>
          <Text style={styles.buttonText}>Simular Netflix (Cartão Nubank)</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Controle de Tempo e Dados</Text>

        <TouchableOpacity style={[styles.button, { backgroundColor: '#FF3B30' }]} onPress={resetDatabase}>
          <Text style={styles.buttonText}>Resetar Banco de Dados</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: '#007AFF' }]} onPress={advanceTime}>
          <Text style={styles.buttonText}>Avançar 30 Dias (Time Travel)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderLeftWidth: 1,
    borderColor: '#333',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 9999,
  },
  title: {
    color: '#BB86FC',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  subtitle: {
    color: '#CCC',
    fontSize: 12,
    marginBottom: 20,
  },
  sectionHeader: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingBottom: 5,
  },
  button: {
    padding: 10,
    borderRadius: 4,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  }
});
