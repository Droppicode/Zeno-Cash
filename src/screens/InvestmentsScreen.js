import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InvestmentsScreen() {
  const assets = [
    { name: 'Tesouro Selic 2029', type: 'Renda Fixa', value: 5000, yield: '+R$ 45,20 (0.9%)' },
    { name: 'Fundo Imobiliário MXRF11', type: 'FIIs', value: 1200, yield: '+R$ 12,00 (1.0%)' },
    { name: 'Ações WEGE3', type: 'Ações', value: 3400, yield: '-R$ 15,00 (-0.4%)' },
  ];

  const totalValue = assets.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Meus Investimentos</Text>
        <Text style={styles.subtitle}>Patrimônio Acumulado</Text>
        <Text style={styles.totalValue}>R$ {totalValue.toFixed(2)}</Text>

        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Carteira Atual</Text>
          <TouchableOpacity>
            <Text style={styles.addText}>+ Novo Ativo</Text>
          </TouchableOpacity>
        </View>

        {assets.map((item, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <Ionicons 
                  name={item.type === 'Renda Fixa' ? 'shield-checkmark' : 'trending-up'} 
                  size={20} 
                  color="#BB86FC" 
                />
              </View>
              <View>
                <Text style={styles.assetName}>{item.name}</Text>
                <Text style={styles.assetType}>{item.type}</Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.assetValue}>R$ {item.value.toFixed(2)}</Text>
              <Text style={[
                styles.assetYield, 
                { color: item.yield.startsWith('-') ? '#F44336' : '#4CAF50' }
              ]}>
                {item.yield}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scroll: {
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
  },
  totalValue: {
    color: '#BB86FC',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addText: {
    color: '#BB86FC',
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    backgroundColor: '#BB86FC20',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assetName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  assetType: {
    color: '#888',
    fontSize: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  assetYield: {
    fontSize: 12,
  }
});
