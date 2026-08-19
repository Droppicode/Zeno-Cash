import React, { useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsContext } from '../context/SettingsContext';

export default function InvestmentsScreen() {
  const { activeTheme } = useContext(SettingsContext);

  const assets = [
    { name: 'Tesouro Selic 2029', type: 'Renda Fixa', value: 5000, yield: '+R$ 45,20 (0.9%)' },
    { name: 'Fundo Imobiliário MXRF11', type: 'FIIs', value: 1200, yield: '+R$ 12,00 (1.0%)' },
    { name: 'Ações WEGE3', type: 'Ações', value: 3400, yield: '-R$ 15,00 (-0.4%)' },
  ];

  const totalValue = assets.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: activeTheme.text }]}>Meus Investimentos</Text>
        <Text style={[styles.subtitle, { color: activeTheme.textSecondary }]}>Patrimônio Acumulado</Text>
        <Text style={[styles.totalValue, { color: activeTheme.accent }]}>R$ {totalValue.toFixed(2)}</Text>

        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Carteira Atual</Text>
          <TouchableOpacity>
            <Text style={[styles.addText, { color: activeTheme.accent }]}>+ Novo Ativo</Text>
          </TouchableOpacity>
        </View>

        {assets.map((item, index) => (
          <View key={index} style={[styles.card, { backgroundColor: activeTheme.card }]}>
            <View style={styles.cardLeft}>
              <View style={[styles.iconBox, { backgroundColor: activeTheme.cardSecondary }]}>
                <Ionicons 
                  name={item.type === 'Renda Fixa' ? 'shield-checkmark' : 'trending-up'} 
                  size={20} 
                  color={activeTheme.accent} 
                />
              </View>
              <View>
                <Text style={[styles.assetName, { color: activeTheme.text }]}>{item.name}</Text>
                <Text style={[styles.assetType, { color: activeTheme.textSecondary }]}>{item.type}</Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.assetValue, { color: activeTheme.text }]}>R$ {item.value.toFixed(2)}</Text>
              <Text style={[
                styles.assetYield, 
                { color: item.yield.startsWith('-') ? activeTheme.expense : activeTheme.income }
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
  },
  scroll: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
  },
  totalValue: {
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  addText: {
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assetName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  assetType: {
    fontSize: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  assetYield: {
    fontSize: 12,
  }
});
