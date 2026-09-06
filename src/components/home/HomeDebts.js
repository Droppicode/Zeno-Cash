import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CurrencyUtils } from '../../utils/currencyUtils';

export default function HomeDebts({ debtsList, activeTheme, styles, navigation }) {
  const totalOwe = debtsList.filter(d => d.type === 'owe').reduce((acc, d) => acc + d.amount, 0);
  const totalOwed = debtsList.filter(d => d.type === 'owed').reduce((acc, d) => acc + d.amount, 0);

  if (totalOwe === 0 && totalOwed === 0) return null;

  return (
    <View style={styles.section}>
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
            <Text style={[styles.groupedAmount, { color: activeTheme.expense }]}>R$ {CurrencyUtils.formatDisplay(totalOwe)}</Text>
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
            <Text style={[styles.groupedAmount, { color: activeTheme.income }]}>R$ {CurrencyUtils.formatDisplay(totalOwed)}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
