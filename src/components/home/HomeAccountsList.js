import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CurrencyUtils } from '../../utils/currencyUtils';

export default function HomeAccountsList({ accountBalances, activeTheme, styles, navigation }) {
  const bankAccounts = accountBalances.filter(a => a.type !== 'credit');
  
  if (bankAccounts.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: activeTheme.text }]}>Suas Contas</Text>
      <View style={[styles.groupedContainer, { backgroundColor: activeTheme.card }]}>
        {bankAccounts.map((acc, idx) => (
          <TouchableOpacity 
            key={acc.id} 
            activeOpacity={0.7}
            onPress={() => {
              navigation.navigate('Transações', { filterAccountId: acc.id });
            }}
          >
            <View style={[
              styles.groupedItem, 
              idx !== bankAccounts.length - 1 && { borderBottomWidth: 1, borderBottomColor: activeTheme.background }
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
              <Text style={[styles.groupedAmount, { color: acc.currentBalance <= -0.01 ? activeTheme.expense : activeTheme.text }]}>
                {acc.currentBalance <= -0.01 ? `- R$ ${CurrencyUtils.formatDisplay(Math.abs(acc.currentBalance))}` : `R$ ${CurrencyUtils.formatDisplay(Math.abs(acc.currentBalance))}`}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={[styles.groupedItem, { borderTopWidth: 1, borderTopColor: activeTheme.background, backgroundColor: activeTheme.card }]}>
          <Text style={[styles.groupedText, { color: activeTheme.text, fontWeight: 'bold' }]}>Total Contas</Text>
          <Text style={[styles.groupedAmount, { color: activeTheme.text, fontWeight: 'bold' }]}>
            R$ {CurrencyUtils.formatDisplay(bankAccounts.reduce((acc, curr) => acc + curr.currentBalance, 0))}
          </Text>
        </View>
      </View>
    </View>
  );
}
