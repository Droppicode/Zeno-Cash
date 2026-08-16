import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
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

      {/* Pendências */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transações Pendentes (2)</Text>
        <View style={styles.pendingCard}>
          <Text style={styles.pendingText}>Uber do Brasil - R$ 24,90</Text>
          <Text style={styles.pendingAction}>Deslize para aprovar</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  summaryTitle: {
    color: '#888',
    fontSize: 16,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  incomeBox: { flex: 1 },
  expenseBox: { flex: 1, alignItems: 'flex-end' },
  incomeText: { color: '#888', fontSize: 14 },
  expenseText: { color: '#888', fontSize: 14 },
  incomeValue: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold' },
  expenseValue: { color: '#F44336', fontSize: 18, fontWeight: 'bold' },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  pendingCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 16,
  },
  pendingText: {
    color: '#fff',
    fontSize: 16,
  },
  pendingAction: {
    color: '#BB86FC',
    fontSize: 14,
    marginTop: 8,
  }
});
